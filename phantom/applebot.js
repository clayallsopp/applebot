/* applebot.js */

var require = patchRequire(require);
var fs = require('fs');
var Casper = require('casper');

var iterate = function(object, callback) {
    var keys = Object.keys(object);
    for (var i = keys.length - 1; i >= 0; i--) {
        var key = keys[i];
        var value = object[key];
        callback(key, value);
    }
};

var merge = function(obj1,obj2) {
    var obj3 = {};
    for (var attrname in obj1) { obj3[attrname] = obj1[attrname]; }
    for (var attrname in obj2) { obj3[attrname] = obj2[attrname]; }
    return obj3;
};

var isFunction = function(obj) {
    return typeof(obj) === 'function';
};

var isUndefined = function(obj) {
    return obj === void(0);
};

var $outputFormat;
var jsonLog = function(obj) {
    console.log(JSON.stringify(obj));
};
console.formatLog = function(string, json) {
    if ($outputFormat === 'json') {
        jsonLog(merge({normal_output: string}, json));
    }
    else if (string.length > 0) {
        console.log(string);
    }
};

var die = function(page, message, metadata) {
    if (isUndefined(metadata)) {
        metadata = {};
    }
    console.formatLog("", {event: "debug_html", html: page.getHTML()});
    //var error = merge({event: "error", message: message}, metadata);
    //console.formatLog("☠ " + message, error);
    page.die("☠ " + message, 1);
};

var dieFromException = function(page, ex, metadata) {
    if (isUndefined(metadata)) {
        metadata = {};
    }
    metadata.stack = ex.stack;
    die(page, ex.message, metadata);
};

var Shortcuts = {
    findHrefSelector: function(innerHTML, page, userQueryScope, options) {
        var queryScope = 'a'
        if (userQueryScope) {
            queryScope = userQueryScope + ' ' + queryScope;
        }
        if (!options) {
            options = {};
        }
        var href = page.evaluate(function(innerHTML, queryScope, options) {
            var links = document.querySelectorAll(queryScope);
            var href = false;
            for(var i = 0; i < links.length; i++) {
                var link = links[i];
                if (options.fuzzy) {
                    if (link.innerHTML.toLowerCase().indexOf(innerHTML.toLowerCase()) !== -1) {
                        href = link.href;
                    }
                }
                else if (link.innerHTML === innerHTML) {
                    href = link.href;
                }
            }

            return href;
        }, innerHTML, queryScope, options);

        var hrefSelector = false;
        if (href) {
            hrefSelector = queryScope +'[href="' + href.replace("https://itunesconnect.apple.com", "") +'"]';
        }

        if (href === false || !page.exists(hrefSelector)) {
            page.debugHTML();
            throw ("Error: could not find " + innerHTML + " link: " + hrefSelector);
        }

        return hrefSelector;
    },
    findFieldName: function(page, fieldLabel, baseSelector) {
        var fieldName = page.evaluate(function(fieldLabel, baseSelector) {
            var fieldContainers = document.querySelectorAll(baseSelector);
            var fieldName = false;
            for (var i = 0; i < fieldContainers.length; i++) {
                var parent = fieldContainers[i];
                var children = parent.children;
                for (var j = 0; j < children.length; j++) {
                    var child = children[j];
                    if (child.innerHTML === fieldLabel) {
                        fieldName = parent.querySelector('input').name;
                        break;
                    }
                }
                if (fieldName !== false) {
                    break;
                }
            }

            return fieldName;
        }, fieldLabel, baseSelector);
        if (fieldName === false) {
            die(page, "Error: could not find " + fieldLabel + " field");
        }
        return fieldName;
    },
    openManageApps: function(page) {
        var hrefSelector = Shortcuts.findHrefSelector("Manage Your Apps", page);
        page.click(hrefSelector);
    },
    getScreenshotPaths: function(userOptions, optionsKey) {
        var screenshotsOption = userOptions[optionsKey];
        var screenshotPaths = [];

        if (screenshotsOption.charAt(0) === "[") {
            // using JSON
            screenshotPaths = JSON.parse(screenshotsOption);
        }
        else {
            screenshotPaths = [screenshotsOption];
        }

        return screenshotPaths;
    },
    popScreenshotPaths: function(userOptions, optionsKey) {
        var screenshotPaths = Shortcuts.getScreenshotPaths(userOptions, optionsKey);

        var value = screenshotPaths.pop();
        userOptions[optionsKey] = JSON.stringify(screenshotPaths);
        return value;
    },
    addStepsForScreenshotGroup: function(applebot, page, userOptions, screenshotStepOption) {
        var key_path = screenshotStepOption.key_path;
        var selector = screenshotStepOption.selector;
        var description = screenshotStepOption.description;
        var next_step = screenshotStepOption.next_step;
        var while_step = screenshotStepOption.while_step;

        var numScreenshots = Shortcuts.getScreenshotPaths(userOptions, key_path).length;
        var waitForScreenshotCount = function(screenshotSelector, count)  {
            var wait = function() {
                var numberOfScreenshots = page.evaluate(function(screenshotSelector) {
                    return document.querySelectorAll(screenshotSelector).length;
                }, screenshotSelector);
                return numberOfScreenshots === count;
            }
            wait.timeout = 8000 * numScreenshots;
            return wait;
        };

        for (var i = 1; i <= numScreenshots; i++) {
            var numUploaded = 0;
            applebot.step("Wait for " + description + " screenshot #" + i + " to upload", 'waitFor', waitForScreenshotCount(selector, i), function() {
                numUploaded += 1;
                if (numUploaded >= numScreenshots) {
                    applebot.action(next_step);
                }
                else {
                    applebot.action(while_step);
                }
            });
        }
    },
    waitToParseProfiles: function(applebot, page,  profileType, callback) {
        page.evaluate(function(profileType) {
            window.profileType = profileType;
        }, profileType);

        if (!page.evaluate(function() { return window.profileDataURL; })) {
            throw "Invalid profile list page, missing window.profileDataURL";
        }

        applebot.action("Grab profile data", function() {
            var parsedProfiles = page.evaluate(function() {
                return window.parsedProfiles;
            });
            callback(parsedProfiles);
        });

        var waitFor = function() {
            var result = page.evaluate(function() {
                if (window.parseFinished) {
                    return true;
                }
                if (window.parseRequest) {
                    return false;
                }
                window.parseStarted = true;
                var url = window.profileDataURL + "&type=" + window.profileType;
                window.parseRequest = $.post(url, function(remoteData, success) {
                    var profiles = {};
                    remoteData.provisioningProfiles.forEach(function(profile) {
                        var appId = profile.appId.identifier;
                        profiles[appId] = {
                            id: profile.provisioningProfileId,
                            download_url: "https://developer.apple.com/account/ios/profile/profileContentDownload.action?displayId=" + profile.provisioningProfileId
                        };
                    });
                    window.parsedProfiles = profiles;
                    window.parseFinished = true;
                });
                return false;
            });
            return result;
        };
        applebot.step("Wait for profiles to parse", 'waitFor', waitFor, function() {
            applebot.action("Grab profile data");
        }, {timeout: 15 * 1000});
    },
    safeFillSelectors: function(page, formSelector, fillOptions, doSubmission) {
        if (doSubmission === undefined) {
            doSubmission = true;
        }
        var safeOptions = {};

        iterate(fillOptions, function(selector, value) {
            if (page.exists(selector)) {
                safeOptions[selector] = value;
            }
        });

        page.fillSelectors(formSelector, safeOptions, doSubmission);
    },
    safeFill: function(page, formSelector, fillOptions, doSubmission) {
        var transformedFillOptions = {};


        iterate(fillOptions, function(fieldName, value) {
            transformedFillOptions['[name="' + fieldName + '"]'] = value;
        });


        Shortcuts.safeFillSelectors(page, formSelector, transformedFillOptions, doSubmission);
    },
    filterBundleIdsFromItunesConnect: function(page, toTitle) {
        var bundleIdMap = {};
        var bundleIdFieldInfo = page.evaluate(function() {
            var bundleIdField = document.querySelector('.bundleIdentifierBox select');
            if (!bundleIdField) {
                return false;
            }
            var bundleIdFieldName = bundleIdField.name;
            var bundleIdFieldOptions = [];
            for (var i = 0; i < bundleIdField.options.length; i++) {
                var option = bundleIdField.options[i];
                if (option.innerHTML === 'Select') {
                    continue;
                }
                bundleIdFieldOptions.push([option.innerHTML, option.value]);
            }

            return {
                name: bundleIdFieldName,
                options: bundleIdFieldOptions
            };
        });
        if (bundleIdFieldInfo === false) {
            die(page, "Error: could not find Bundle ID field");
        }
        var bundleIdOptions = bundleIdFieldInfo.options;
        var i = bundleIdOptions.length; //or 10
        while (i--) {
            var option = bundleIdFieldInfo.options[i];
            var nameString = option[0];
            var formValue = option[1];
            var nameAndBundle = nameString.split("-").map(function(s) { return s.trim() });
            if (toTitle) {
                bundleIdMap[nameAndBundle[1]] = nameAndBundle[0];
            }
            else {
                bundleIdMap[nameAndBundle[1]] = formValue;
            }
        }

        return bundleIdMap;
    },
    searchITCApps: function(page, searchParams) {
        var formOptions = {};
        if (searchParams.title) {
            formOptions['.search-param-value-name input'] = searchParams.title;
        }
        if (searchParams.apple_id) {
            formOptions['.search-param-value-appleId input'] = searchParams.apple_id;
        }
        if (searchParams.sku) {
            formOptions['.search-param-value-sku input'] = searchParams.sku;
        }
        Shortcuts.safeFillSelectors(page, 'form[name="mainForm"]', formOptions, false);
        page.click('.searchfield input');
    },
    addStepToWaitForListOfRecentApps: function(applebot, callback) {
        applebot.step("Wait for the list of recent apps", 'waitForResource', 'btn-blue-add-new-app.png', function() {
            callback();
        });
    },
    addStepsToSearchAndClickAppTitle: function(applebot, page, title, callback) {
        applebot.action("Fill the apps search box", function() {
            applebot.shortcuts.searchITCApps(page, {title: title});
        });

        applebot.action('Find the app link and click it', function() {
            var hrefSelector = applebot.shortcuts.findHrefSelector(title, page, undefined, { fuzzy: true});
            page.click(hrefSelector);
        });

        applebot.shortcuts.addStepToWaitForListOfRecentApps(applebot, function() {
            applebot.action("Fill the apps search box");
        });

        applebot.step("Wait for the search results", 'waitForText', 'Search Results', function() {
            applebot.action('Find the app link and click it');
        });

        applebot.step("Wait for the app info screen", 'waitForText', 'App Information', function() {
            callback();
        });
    }
}

function AppleBot(options) {
    var _username, _password;
    var applebot = this;
    var _currentPage;
    var _actions = {};
    var _steps = [];

    if (!isUndefined(options.username)) {
        _username = options.username;
    }
    if (!isUndefined(options.password)) {
        _password = options.password;
    }
    if (!isUndefined(options.output_format)) {
        $outputFormat = options.output_format;
    }

    var logStepStart = function(stepName) {
        console.formatLog("- " + stepName, {event: "step_start", name: stepName});
    };
    var logStepComplete = function(stepName) {
        console.formatLog("✔ " + stepName, {event: "step_complete", name: stepName});
    };
    var logActionStart = function(actionName) {
        console.formatLog("- " + actionName, {event: "action_start", name: actionName});
    };
    var logActionComplete = function(actionName) {
        console.formatLog("✔ " + actionName, {event: "action_complete", name: actionName});
    };
    var logStepFail = function(stepName) {
        console.formatLog("! " + actionName, {event: "step_fail", name: stepName});
    };
    var logPageError = function(error) {
        console.formatLog("X - " + errors[i], {event: "page_error", error: error});
    };

    this.result = function(result) {
        jsonLog({'result': result});
    };

    var createPage = function() {
        var page = Casper.create({
            verbose: true,
            logLevel: 'warning',
            //logLevel: 'info',
            waitTimeout: 10000
        });
        page.echo = function(string, style) {
            console.formatLog(string, {message: string, event: "echo"});
            return page;
        };

        phantom.cookiesEnabled = true;
        page.userAgent('Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_4; en-US) AppleWebKit/534.7 (KHTML, like Gecko) Chrome/7.0.517.41 Safari/534.7');
        return page;
    };

    // Works for both ADC and ITC
    this.openPage = function(url, callback) {
        var page = createPage();

        logStepStart("Wait for the login URL");
        page.start(url, function() {
            logStepComplete("Wait for the login URL");
            logActionStart("Fill the login form");
            try {
                Shortcuts.safeFill(page, 'form', {
                    'theAccountName': _username,
                    'theAccountPW': _password,
                    'appleId': _username,
                    'accountPassword': _password
                }, true);
            }
            catch (ex) {
                dieFromException(page, ex);
            }
        });
        page.then(function(response) {
            logActionComplete("Fill the login form");

            logStepStart("Wait for the login to process");
            if (page.exists('.dserror')) {
                die(page, "Login error: " + page.getHTML('.dserror'));
            }
            logStepComplete("Wait for the login to process");
            logActionStart("Open the action URL (" + url + ")");
        });
        page.thenOpen(url, function() {
            logActionComplete("Wait for the action URL to load");
            callback(page);
        });

        page.run();

        this.setPage(page);
    };

    this.shortcuts = Shortcuts;

    var addAction = function(actionName, actionImpl) {
        _actions[actionName] = actionImpl;
    };

    var runAction = function(actionName) {
        var action = _actions[actionName];
        if (action) {
            logActionStart(actionName);
            try {
                action();
                logActionComplete(actionName);
            } catch (ex) {
                dieFromException(_currentPage, ex, {action: actionName});
            }
        }
        else {
            die(_currentPage, "Could not find registered action for '" + actionName + "'");
        }
    };

    this.action = function(actionName, actionImpl) {
        if (isUndefined(actionImpl)) {
            runAction(actionName);
        }
        else {
            addAction(actionName, actionImpl);
        }
    };

    var logPageErrors = function() {
        _currentPage.debugHTML();

        var errors = _currentPage.evaluate(function() {
            var errors = [];
            var errorEls = document.querySelectorAll(".global-message.error li span");
            for (var i = 0; i < errorEls.length; i++) {
                errors.push(errorEls[i].innerHTML);
            }
            return errors;
        });
        for (var i = 0; i < errors.length; i++) {
            logPageError(errors[i]);
        }
    };

    this.step = function(stepName, methodName, methodArg, callback, options) {
        var _step = {
            name: stepName,
            methodName: methodName,
            methodArg: methodArg,
            methodDescription: function() {
                var argDescription = "'" + _step.methodArg + "'";
                if (isFunction(_step.methodArg)) {
                    argDescription = "[function]";
                }
                return  _step.name + " ( " + _step.methodName + "(" + argDescription + ")" + " )";
            },
            callback: callback,
            options: options || {}
        }
        var method = _currentPage[_step.methodName];
        var timeout = undefined;
        if (_step.options.timeout) {
            timeout = _step.options.timeout;
        }
        method.bind(_currentPage)(_step.methodArg, function() {
            logStepComplete(_step.name);
            if (isFunction(_step.callback)) {
                _step.callback();
            }
        }, function() {
            logStepFail(_step.name);
            var userDieMethod = _step.options.onFail;
            if (isFunction(_step.options)) {
                userDieMethod = _step.options;
            }
            var shouldDie = true;
            if (userDieMethod) {
                shouldDie = (userDieMethod() !== false);
            }
            if (shouldDie === true) {
                logPageErrors();
                die(_currentPage, "Failed @ " + _step.methodDescription(), {step: _step.name});
            }
        }, timeout);
    }

    this.setPage = function(page) {
        _currentPage = page;
    }
};

var getOptionsWithManifest = function() {
    var casper = require("casper").create();
    var options = casper.cli.options;

    var manifest = options.manifest;
    if (manifest) {
        var f = fs.open(manifest, "r");
        options = JSON.parse(f.read());
    }

    return options;
}

var _commandConfigs = null;
var CommandConfigs = function() {
    if (_commandConfigs === null) {
        var options = getOptionsWithManifest();
        // no __FILE__ equivalent in phantomjs, unfortunately
        var applebotRootPath = options.applebot_root_path;
        var _commandsFilePath = applebotRootPath + fs.separator + 'phantom' + fs.separator + '_commands.json';
        _commandConfigs = JSON.parse(fs.open(_commandsFilePath, "r").read());
    }
    return _commandConfigs;
}

function CommandHandler(fileName) {

    var _fullOptions = CommandConfigs()[fileName];
    var _options = {};
    _options.options = {
        required: [],
        optional: []
    };

    var optionToString = function(optionData) {
        return optionData.key;
    };
    var parseOption = function(optionData) {
        if (optionData.batch) {
            return optionData.keys;
        }
        else {
            return optionToString(optionData);
        }
    };
    var parseOptions = function(optionList) {
        var _optionList = [];
        for (var i = optionList.length - 1; i >= 0; i--) {
            var parsed = parseOption(optionList[i]);
            if (parsed instanceof Array) {
                _optionList = _optionList.concat(parsed);
            }
            else {
                _optionList.push(parsed);
            }
        };
        return _optionList;
    };

    if (_fullOptions.options.required) {
        _options.options.required = parseOptions(_fullOptions.options.required);
    }
    if (_fullOptions.options.optional) {
        _options.options.optional = parseOptions(_fullOptions.options.optional);
    }

    var _description = _options.description;
    var _requiredCommands = _options.options.required;
    var _optionalCommands = _options.options.optional;
    var ARG_OFFSET = 1;

    this.description = function() {
        var requiredString = _requiredCommands.map(function(c) {
            return "<" + c + ">";
        }).join(" ");
        var optionalString = _optionalCommands.map(function(c) {
            return "--" + c  + "=<" + c + ">";
        }).join(" ");
        return _description + ": " + requiredString + " " + optionalString;
    }

    this.parseArgs = function() {
        var casper = require("casper").create();

        var givenOptions = {};
        var requiredValues = casper.cli.args || [];
        var allButRequired = getOptionsWithManifest();

        for (var i = 0; i < _requiredCommands.length; i++) {
            var key = _requiredCommands[i];
            if (allButRequired[key]) {
                requiredValues.push(allButRequired[key]);
            }
        }

        if (requiredValues.length != _requiredCommands.length) {
            var message = "Incomplete arguments - need to include " + _requiredCommands;
            throw message;
        }

        for (var i = 0; i < _requiredCommands.length; i++) {
            var key = _requiredCommands[i];
            givenOptions[key] = requiredValues[i];
        }

        for (var i = 0; i < _optionalCommands.length; i++) {
            var key = _optionalCommands[i];
            givenOptions[key] = allButRequired[key];
        }

        return givenOptions;
    };

    this.getAuthFromArgs = function() {
        var options = getOptionsWithManifest();

        return {
            username: options.username,
            password: options.password,
            output_format: options.output_format
        };
    }
}

exports.AppleBot = AppleBot;
exports.CommandHandler = CommandHandler;