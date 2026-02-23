#!/bin/bash

# PR Title Validator - Local Testing Script
# Usage: ./validate_pr_title.sh "Your PR Title Here"

TITLE="$1"

if [ -z "$TITLE" ]; then
    echo "Usage: $0 \"<PR Title>\""
    echo "Example: $0 \"DOT-6205: SmartUI | SmartIgnore support for fetch-screenshot-status hook\""
    exit 1
fi

echo "Testing PR title: '$TITLE'"
echo "----------------------------------------"

# Enforce minimum length
if [[ ${#TITLE} -lt 20 ]]; then
    echo "❌ FAILED: PR title must be at least 20 characters (got ${#TITLE})."
    echo "Expected format: '<PROJECT>-<NUMBER>: <Scope> | <Short, descriptive title>'"
    echo "Examples: 'TTN-1010: RD App | Add something', 'ABC-42: GRID | Improve logging'"
    exit 1
fi

# Require titles like:
#   ABC-1010: RD App | Change something
#   [ABC-0100]: RD App | Change something
# Supports any JIRA project key; scope as Title Case or UPPERCASE acronyms
if [[ "$TITLE" =~ ^(\[[A-Z][A-Z0-9]+-[0-9]+\]:|[A-Z][A-Z0-9]+-[0-9]+:)\ (([A-Z][a-z0-9]+|[A-Z0-9]+)([ /-]([A-Z][a-z0-9]+|[A-Z0-9]+))*)\ \|\ .+ ]]; then
    echo "✅ PASSED: Title format looks good!"
    echo "Format: '<PROJECT>-<NUMBER>: <Scope> | <Short, descriptive title>'"
    exit 0
else
    echo "❌ FAILED: Invalid PR title format."
    echo "Expected format: '<PROJECT>-<NUMBER>: <Scope> | <Short, descriptive title>'"
    echo "Examples:"
    echo "  - 'TTN-0100: RD App | Change something'"
    echo "  - '[ABC-42]: GRID | Skip internet check'"
    echo "  - 'DOT-123: SmartUI | Add new feature'"
    exit 1
fi