currentTime=$(date +%d-%m-%Y_%H:%M) && \
  {
    npx smartui capture $test --config smartui-web.json --buildName $currentTime --scheduled $SCHEDULE_ID 2>&1 | tee .smartui.log
    
    exit_code=${PIPESTATUS[0]}
    
    if [ $exit_code -ne 0 ]; then
      echo "Error occurred during smartui execution"
      echo "Exit code: $exit_code"
      echo "Full log content:"
      cat .smartui.log
      
      # Try multiple error patterns to capture the error message
      error_message=$(grep -i "error\|failed\|exception\|invalid\|must NOT\|additional properties" .smartui.log | head -n 1)
      
      if [ -z "$error_message" ]; then
        # If no error pattern found, get the last few lines of the log
        error_message=$(tail -n 5 .smartui.log | tr '\n' ' ')
      fi
      
      # Clean up the error message (remove leading/trailing whitespace and special chars)
      error_message=$(echo "$error_message" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | sed 's/^[^a-zA-Z0-9]*//; s/[^a-zA-Z0-9]*$//')
      
      echo "Captured error message: '$error_message'"
      echo "Sending error to API..."
      
      # Escape the error message for JSON
      error_message_escaped=$(echo "$error_message" | sed 's/"/\\"/g' | sed 's/\n/\\n/g' | sed 's/\r/\\r/g')
      
      curl --location 'https://stage-api.lambdatestinternal.com/webscan/api/v1/builds/smartui-cli/errors' \
        --header 'Content-Type: application/json' \
        --data "{
            \"scheduleId\": $SCHEDULE_ID,
            \"buildName\": \"$currentTime\",
            \"jobId\": \"$JOB_ID\",
            \"remark\": \"$error_message_escaped\"
        }"

      echo "Error report sent to API"
    else
      echo "SmartUI execution completed successfully"
    fi
  } 