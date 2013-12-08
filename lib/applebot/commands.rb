module AppleBot
  mattr_accessor :commands

  class Command < Struct.new(:file_name, :namespace, :action, :description, :options)
    def initialize(*properties)
      options = properties.delete_at -1
      super(*properties)
      self.options = CommandOptionSet.new(options['required'], options['optional'])
    end

    def self.load_all!
      commands_file_path = File.join(AppleBot.phantom_scripts_path, '_commands.json')
      commands = JSON.parse(IO.read(commands_file_path))
      AppleBot.commands = commands.keys.map {|file|
        command_config = commands[file]
        args = [file] + [
          command_config['namespace'], command_config['action'],
          command_config['description'], command_config['options']
        ]
        Command.new(*args)
      }
    end

    def cli_command
      "#{namespace}:#{action}"
    end

    def ruby_method
      "#{action}_#{namespace}"
    end
  end

  class CommandOptionSet < Struct.new(:required, :optional)
    def initialize(required, optional)
      fix_batch_options = lambda { |set, extras|
        set.map {|o|
          if o['batch']
            o['keys'].map {|k|
              h = {
                'key' => k
              }.merge(o)
              h.delete 'keys'
              h.delete 'batch'
              h
            }
          else
            o
          end
        }.flatten.map {|o|
          o = o.merge(extras)
          CommandOption.new(o['key'], o['description'], o['values'], o['default'], o['required'])
        }
      }
      required = fix_batch_options.call(required, {'required' => true}) if required
      required ||= []
      optional = fix_batch_options.call(optional, {'required' => false}) if optional
      optional ||= []
      super(required, optional)
    end
  end

  class CommandOption < Struct.new(:key, :description, :values, :default, :required)
    def cli_description
      s = ""
      s << "REQUIRED " if required
      s << "#{description}"
      s.tap do |d|
        d << " - VALUES: #{values}" if values
        d << " - DEFAULT: #{default}" if default
      end
    end
  end
end
AppleBot::Command.load_all!