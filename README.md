# AppleBot - The Apple Robot

A CLI and Ruby library to manage Apple Developer Center and iTunes Connect tasks. Uses [CasperJS](http://casperjs.org/) for easy maintenance and flexibility.

## Requirements

AppleBot requires [CasperJS](http://casperjs.org/), which can be installed using [Homebrew](http://brew.sh/):

```
$ brew install casperjs --devel
```

## Installation

```
$ gem install applebot
```

## Usage

### Commands

These commands run using iTunes Connect:

- `app:create` - Creates an entry for a new app on iTunes Connect
- `app:update` - Creates an entry for a new update to an existing app on iTunes Connect
- `app:reject_binary` - Rejects the binary for a pending release (either new or an update)
- `app:remove_from_sale` - Removes the app from sale in all territories

These commands run using the Apple Developer Center:

- `app_id:create` - Creates a bundle identifier
- `app_id:delete` - Removes a bundle identifier
- `profile:create` - Creates a provisioning profile
- `profile:download` - Downloads an existing provisioning profile
- `profile:list` - Lists all provisioning profiles

These commands can run on either iTunes Connect or Apple Developer Center:

- `app_id:list` - Lists all bundle identifiers

#### JSON Manifests

Most commands take in options - you can either pass them individually, or use a JSON manifest file like this:

```json
{
    "name": "My new app",
    "app_id": "com.usepropeller.mynewapp"
}
```

For example, the following commands are equivalent usng this JSON manifest:

```shell
$ applebot app_id:create --name 'My new app' --app_id 'com.usepropeller.mynewapp'
$ applebot app_id:create --manifest ./manifest.json
```

```ruby
> AppleBot.app_id.create(name: 'My new app', app_id: 'com.usepropeller.mynewapp')
> AppleBot.app_id.create(manifest './manifest.json')
```

### CLI

AppleBot installs an `applebot` command, which you can explore with `-h` flags:

```shell
$ applebot -h

  Commands:
    app:create           Create App
    app:reject_binary    Reject the binary of an pending release
    app:remove_from_sale Remove app from sale
    app:update           Update App
    app_id:create        Create App ID
    app_id:delete        Delete App ID
    app_id:list          List App IDs
    help                 Display global or [command] help documentation.
    profile:create       Create Provisioning Profile
    profile:download     Download a Provisioning Profile
    profile:list         List Provisioning Profiles

  Global Options:
    --manifest FILE.json Use a JSON file to load options for each command
    --username USERNAME  Username to login to Apple Service, or $APPLEBOT_USERNAME
    --password PASSWORD  Password to login to Apple Service, or $APPLEBOT_PASSWORD
    --format FORMAT      Output format - ['json', 'pretty']
    --verbose            Verbose output
```

#### Authentication

For every command, you can pass `--username` and `--password` flags to enter you auth credentials; you can also set `APPLEBOT_USERNAME` and `APPLEBOT_PASSWORD` environment variables.

### Ruby

The Ruby library uses an `AppleBot` module, and its methods map to the CLI commands:

```ruby
> require 'applebot'
=> true
> AppleBot.app.create(options: here)
```

#### Authentication

The Ruby library has a few shortcuts for logging in to Apple services:

```ruby
# pass as options
AppleBot.app.create(username: "username", password: "password")

# run in block
AppleBot.with_credentials(username: "username", password: "password") do
    AppleBot.app.create(options)
end

# set globally
AppleBot.set_credentials(username: "username", password: "password")
```


### Output

The `:list` commands are meant to return some data. If you're using the Ruby library, you'll receive an `Array` when the command is done; if you're using the CLI, the last line will output a JSON object with one entry.

```ruby
AppleBot.app_ids.all
=> ["com.usepropeller.myapp"]
```

```bash
$ applebot app_ids:all
{"app_ids": ["com.usepropeller.myapp"]}
```

If you're using any other command (which generally create side-effects), the end result will be `true` in Ruby, or exit code 0 on the CLI.

#### Verbose & Pretty Output

You can base a `--verbose` flag (or a `verbose: true` option in Ruby) to see all of the output as each script processes. There are two output formats, `json` and `pretty`, which you are set with either the `--format` flag or `format: 'format_string'` in Ruby.

## Contact

[Clay Allsopp](http://clayallsopp.com/)
- [clay@usepropeller.com](mailto:clay@usepropeller.com)
- [@clayallsopp](https://twitter.com/clayallsopp)

## License

AppleBot is available under the MIT license. See the [LICENSE](LICENSE) file for more info.