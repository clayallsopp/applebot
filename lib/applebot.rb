proj_root = File.expand_path(File.join(File.dirname(__FILE__), '..'))
$:.unshift(File.join(proj_root, 'vendor', 'botlib', 'lib'))

require 'botlib'

require_relative 'applebot/error'

class AppleBot
  cattr_accessor :loaded

  class Shell < BotLib::Shell
    def raise_error_for_output!(output)
      raise AppleBotError.for_output(output)
    end
  end

  class Command < BotLib::Command
    def self.load_all!
      commands_file_path = File.join(AppleBot.phantom_scripts_path, '_commands.json')
      commands = JSON.parse(IO.read(commands_file_path))
      AppleBot.commands = commands.keys.map {|file|
        command_config = commands[file]
        args = [file] + [
          command_config['namespace'], command_config['action'],
          command_config['description'], command_config['options']
        ]
        new(*args)
      }
    end
  end

  class CommandProxy < BotLib::CommandProxy
    self.bot = AppleBot
  end

  class CLI < BotLib::CLI
    self.name = "AppleBot"
    self.version = AppleBot::VERSION
    self.description = AppleBot::DESCRIPTION
    self.author = 'Clay Allsopp <clay@usepropeller.com>'
    self.website = AppleBot::WEBSITE
    self.username_option_description = 'Username to login to Apple Service, or $APPLEBOT_USERNAME'
    self.password_option_description = 'Password to login to Apple Service, or $APPLEBOT_PASSWORD'
    self.cli_name = "applebot"
    self.bot_class = AppleBot
  end

  include BotLib::API

  class << self
    def shell
      @shell ||= AppleBot::Shell.new
    end

    def cli
      @cli ||= AppleBot::CLI.new
    end

    def applebot_root_path
      File.expand_path(File.join(File.dirname(__FILE__), '..'))
    end

    def phantom_scripts_path
      File.join(applebot_root_path, 'phantom')
    end

    def command_file_path(command)
      file = command
      if !file.end_with?(".js")
        file << ".js"
      end
      File.join(phantom_scripts_path, file)
    end

    def casper_installed?
      !!BotLib.find_executable("casperjs")
    end

    def run_command(command, options = {})
      raise "CasperJS is not installed - `brew install caspjerjs --devel` or visit http://casperjs.org/" if !casper_installed?

      options = options.with_indifferent_access
      verbose = options.delete(:verbose)
      format = options.delete(:format).to_s
      print_result = options.delete(:print_result)

      if options[:manifest]
        options = File.open(options[:manifest], 'r') { |f|
          JSON.parse(f.read).with_indifferent_access
        }
      end

      command_file = command_file_path(command)
      manifest_file = Tempfile.new('manifest.json')
      begin
        write_options = {
          "output_format" => 'json',
          "username" => options[:username] || @username || ENV['APPLEBOT_USERNAME'],
          "password" => options[:password] || @password || ENV['APPLEBOT_PASSWORD'],
          "applebot_root_path" => AppleBot.applebot_root_path
        }.merge(options)
        manifest_file.write(write_options.to_json)

        manifest_file.close

        sys_command = "casperjs #{command_file} --manifest=#{manifest_file.path.to_s.shellescape}"
        command_result = shell.command(sys_command, verbose, format)

        if command_result != nil
          shell.result(command_result, format, print_result)
        else
          true
        end
      ensure
        manifest_file.unlink
      end
    end
  end
end

if !AppleBot.loaded
  AppleBot.loaded = true
  AppleBot::Command.load_all!
  AppleBot.commands.each { |command|
    command_proxy = AppleBot::CommandProxy.for(command)
    command_proxy.attach_to(AppleBot)
  }
  AppleBot::CLI.commands = AppleBot.commands
end

