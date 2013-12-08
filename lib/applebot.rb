require 'shellwords'
require 'tempfile'
require 'json'
require 'open3'

require 'active_support/core_ext/hash/indifferent_access'
require 'active_support/core_ext/object/blank'
require 'active_support/core_ext/module/attribute_accessors'
require 'active_support/core_ext/class/attribute'
require 'active_support/core_ext/hash/except'

require 'terminal-table'

module AppleBot
  module_function

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
    !!find_executable("casperjs")
  end

  def shell
    @shell ||= Shell.new
  end
end

require_relative 'applebot/commands'
require_relative 'applebot/version'
require_relative 'applebot/error'
require_relative 'applebot/shell'
require_relative 'applebot/mkmf'
require_relative 'applebot/command_proxy'

module AppleBot
  module_function

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

  AppleBot.commands.each { |command|
    command_proxy = CommandProxy.for(command)
    command_proxy.attach_to(self)
  }
end