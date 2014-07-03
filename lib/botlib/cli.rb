module BotLib
  class CLI
    include Commander::Methods

    class_attribute :name, :version, :description, :website, :author
    class_attribute :username_option_description
    class_attribute :password_option_description
    class_attribute :commands
    class_attribute :cli_name
    class_attribute :bot_class

    def run
      HighLine.track_eof = false # Fix for built-in Ruby
      Signal.trap("INT") {} # Suppress backtrace when exiting command

      program :name, self.class.name
      program :version, self.class.version
      program :description, self.class.description

      program :help, 'Author', self.class.author
      program :help, 'Website', self.class.website
      program :help_formatter, :compact

      default_command :help

      global_option('--manifest FILE.json', 'Use a JSON file to load options for each command') { |file|
        $manifest_file = file
      }

      global_option('--username USERNAME', self.class.username_option_description) { |username|
        $username = username
      }

      global_option('--password PASSWORD', self.class.password_option_description) { |password|
        $password = password
      }

      global_option('--format FORMAT', "Output format - 'json' or 'pretty'") { |format|
        $format = format
      }

      global_option('--verbose', "Verbose output") {|verbose|
        $verbose = verbose
      }

      self.class.commands.each do |bot_command|
        command bot_command.cli_command.to_sym do |c|
          c.syntax = "#{self.class.cli_name} #{bot_command.cli_command} [options]"
          c.description = bot_command.description
          c.summary = bot_command.description

          (bot_command.options.required + bot_command.options.optional).each do |bot_option|
            c.option "--#{bot_option.key} VALUE", bot_option.cli_description
          end

          c.action do |args, options|
            user_options = {
              manifest: $manifest_file,
              format: $format || 'pretty',
              verbose: $verbose,
              print_result: true
            }.merge(options.__hash__)

            credentials = {username: $username, password: $password}

            ret_value = false
            self.bot_class.with_credentials(credentials) do |bot|
              ret_value = bot.run_command(bot_command.ruby_method, user_options)
            end
            $username = nil
            $password = nil
            $manifest_file = nil
            $format = nil
            $verbose = nil
            ret_value
          end
        end
      end

      run!
    end
  end
end