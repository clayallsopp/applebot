module AppleBot
  class Shell
    def command(sys_command, verbose, format)
      output = []
      Open3.popen3(sys_command) do |stdin, stdout, stderr, wait_thr|
        while line = (stdout.gets || stderr.gets)
          output << line
          if verbose === true
            puts_format_line(line, format)
          end
        end
        exit_status = wait_thr.value
        output << JSON.generate(process_status: exit_status.inspect, thread: wait_thr.inspect)
        if exit_status.termsig
          raise SignalTermination.new(exit_status)
        end
        unless exit_status.success?
          raise AppleBotError.for_output(output)
        end
      end

      output.select {|o|
        o.include?('"result":')
      }.last
    end

    def puts_format_line(line, format)
      json = JSON.parse(line)

      case format.to_s
      when 'json'
        puts JSON.generate(json.except('normal_output'))
      else
        normal_output = json['normal_output']
        return if normal_output.blank?
        return if normal_output.include?("[phantom]")
        puts(normal_output)
      end
    end

    def result(output, format, print_result)
      result = JSON.parse(output)['result']

      case format.to_s
      when 'pretty'
        table(result).tap do |t|
          puts t if print_result
        end
        true
      else
        result.tap do |json|
          puts json if print_result
        end
      end
    end

    def table(data)
      table = nil
      if data.first && data.first[-1].is_a?(Hash)
        headings = ['key'] + data.first[-1].keys
        rows = data.to_a.map { |key_and_value|
          row = []
          headings.each do |heading|
            if heading == 'key'
              row << key_and_value[0]
            else
              row << key_and_value[1][heading]
            end
          end
          row
        }
        table = Terminal::Table.new headings: headings, rows: rows
      else
        table = Terminal::Table.new rows: data.to_a
      end
      table
    end
  end
end