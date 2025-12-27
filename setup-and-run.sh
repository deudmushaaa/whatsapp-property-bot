#!/bin/bash

# Stop on any error
set -e

echo "🧹 Clearing old session data..."
rm -rf ./auth_info
mkdir -p ./auth_info

# Source NVM and set the correct Node.js version.
# This is the most critical step.
echo "📦 Setting up Node.js environment..."
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Unset the conflicting environment variable that has been causing network issues.
# This must be done *after* sourcing NVM.
if [ -n "$NPM_CONFIG_PREFIX" ]; then
    echo "🚫 Unsetting conflicting NPM_CONFIG_PREFIX variable."
    unset NPM_CONFIG_PREFIX
fi

# Use the Node.js version specified in .nvmrc (v20)
nvm use

echo "
✅ Environment is clean and Node.js version is correct:"
node -v

# Run the bot
echo "
🚀 Starting bot..."
node index.js
