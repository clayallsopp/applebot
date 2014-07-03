require 'shellwords'
require 'tempfile'
require 'json'
require 'open3'
require 'commander'

require 'active_support/core_ext/hash/indifferent_access'
require 'active_support/core_ext/object/blank'
require 'active_support/core_ext/module/attribute_accessors'
require 'active_support/core_ext/class/attribute'
require 'active_support/core_ext/hash/except'
require 'active_support/concern'

require 'terminal-table'

require_relative 'botlib/commands'
require_relative 'botlib/version'
require_relative 'botlib/shell'
require_relative 'botlib/mkmf'
require_relative 'botlib/command_proxy'
require_relative 'botlib/cli'

module BotLib
  module API
    extend ActiveSupport::Concern

    included do
      class_attribute :commands

      def shell; nil; end
      def cli; nil; end
      def run_command(command, options = {}); nil; end

      def set_credentials(options = {})
        @username = options[:username]
        @password = options[:password]
        true
      end

      def with_credentials(options = {})
        set_credentials(options)
        yield(self).tap do |res|
          set_credentials({})
        end
      end
    end
  end
end
