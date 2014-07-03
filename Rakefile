require "bundler/gem_tasks"
require "bundler/setup"

require './lib/applebot.rb'

require 'dotenv'
Dotenv.load

task :console do
  require 'irb'
  ARGV.clear
  IRB.start
end

task :update_botlib do
  `git subtree pull --prefix vendor/botlib https://github.com/usepropeller/botlib.git master --squash`
end