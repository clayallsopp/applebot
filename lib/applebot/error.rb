module AppleBot
  class AppleBotError < StandardError
    class_attribute :message
    self.message = "Unspecified AppleBot error occured"
    attr_reader :output, :html

    def initialize(error, output = [], message = nil)
      super(self.class.message)
      output ||= []
      output = output.map(&:strip).reject(&:blank?)
      @html = output.select {|n|
        is_debug_html?(n)
      }.map { |s|
        JSON.parse(s)['html']
      }.first

      @output = output.reject {|n|
        is_debug_html?(n)
      }

      full_backtrace = (@output.map { |o|
        "#{o}:in `AppleBot'"
      } + error.backtrace).compact
      set_backtrace(full_backtrace)
    end

    def is_debug_html?(line)
      line.include?('"event":"debug_html"')
    end
  end

  class AppIdNotFound < AppleBotError
    self.message = "Could not find App Bundle ID in the HTML"
  end

  class AppleMaintenanceMode < AppleBotError
    self.message = "Apple is currently in maintenance mode"
  end

  class AuthenticationError < AppleBotError
    self.message = "Provided Apple ID credentials were incorrect"
  end

  class MultipleProfileError < AppleBotError
    self.message = "Attempted to re-create an existing profile"
  end

  class AppNameTakenError < AppleBotError
    self.message = "The app name you entered is taken"
  end

  class SignalTermination < StandardError
    def initialize(status)
      super("The process was terminated with signal #{status.termsig} (#{Signal.signame(status.termsig)})")
    end
  end

  MESSAGE_FRAGMENT_TO_ERROR = {
    "could not find App ID in options" => AppIdNotFound,
    'class="maintenance"' => AppleMaintenanceMode,
    'iTunes Connect is temporarily unavailable' => AppleMaintenanceMode,
    'Your Apple ID or password was entered incorrectly' => AuthenticationError,
    'Multiple profiles found with the name' => MultipleProfileError,
    'The App Name you entered has already been used' => AppNameTakenError,
  }

  class AppleBotError
    def self.for_output(output = [])
      output ||= []

      error_class = nil

      output.each { |line|
        MESSAGE_FRAGMENT_TO_ERROR.each { |message, klass|
          if line.include?(message)
            error_class = klass
            break
          end
        }
        break if error_class
      }
      error_class ||= AppleBotError

      begin
        # capture the Ruby-level stack trace
        raise StandardError
      rescue Exception => e
        error_class.new(e, output)
      end
    end

    def self.test
      raise for_output(["something", "happened"])
    end
  end

end