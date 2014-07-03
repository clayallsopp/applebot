# coding: utf-8
lib = File.expand_path('../lib', __FILE__)
$LOAD_PATH.unshift(lib) unless $LOAD_PATH.include?(lib)
require 'botlib/version'

Gem::Specification.new do |spec|
  spec.name          = "botlib"
  spec.version       = BotLib::VERSION
  spec.authors       = ["Clay Allsopp"]
  spec.email         = ["clay.allsopp@gmail.com"]
  spec.summary       = "The shared engine for AppleBot and PlayBot"
  spec.homepage      = ""
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0")
  spec.executables   = spec.files.grep(%r{^bin/}) { |f| File.basename(f) }
  spec.test_files    = spec.files.grep(%r{^(test|spec|features)/})
  spec.require_paths = ["lib"]

  spec.add_dependency "commander", "~> 4.2.0"
  spec.add_dependency "activesupport", ">= 3.2"
  spec.add_dependency "terminal-table", ">= 1.4.0"

  spec.add_development_dependency "bundler", "~> 1.5"
  spec.add_development_dependency "rake"
end
