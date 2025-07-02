#!/bin/bash

# Test Graph Memory Relations Creation

echo "🔗 Testing Graph Memory Relations Creation..."

# Test memory 1: Add relationship memory
echo "Adding memory 1: Relationship info..."
curl -s "https://talk2me.up.railway.app/api/memory/debug-mem0" > /dev/null

# Add another memory via chat to create relations
echo "Memory should now have relations between entities: Natalia, Maciej, TALK2Me"
echo "Check Mem0 dashboard for graph visualization!"

echo "✅ Graph Memory test completed - check results in debug endpoint"