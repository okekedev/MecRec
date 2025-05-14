#!/bin/bash
# Direct replacement of the problematic file

echo "Replacing uuid.web.js with a simpler implementation..."

UUID_FILE="./node_modules/expo-modules-core/build/uuid/uuid.web.js"

if [ -f "$UUID_FILE" ]; then
  # Back up the original file
  cp "$UUID_FILE" "${UUID_FILE}.backup"
  
  # Replace with a direct implementation that doesn't need crypto
  cat > "$UUID_FILE" << 'EOF'
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = void 0;

function generateUUID() {
    // Simple UUID v4 implementation that works in any environment
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
exports.generateUUID = generateUUID;
//# sourceMappingURL=uuid.web.js.map
EOF

  echo "Replaced uuid.web.js successfully"
else
  echo "Error: Could not find $UUID_FILE"
  exit 1
fi

echo "Clear the cache and restart the dev server..."
npm start -- --clear-cache