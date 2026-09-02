#!/usr/bin/env bash

echo "========================================================"
echo "        NexusHub Collaborative Workspace SaaS          "
echo "========================================================"
echo ""

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR"

if [ ! -d "node_modules" ]; then
    echo "Installing root dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "Installing server dependencies..."
    npm install --prefix server
fi

if [ ! -d "client/node_modules" ]; then
    echo "Installing client dependencies..."
    npm install --prefix client
fi

echo ""
echo "Starting NexusHub API Server & Frontend App..."
echo " - Server API & Sockets: http://localhost:5000"
echo " - Client Frontend App:  http://localhost:5173"
echo ""

npx concurrently --names "SERVER,CLIENT" --prefix-colors "blue,magenta" "npm run dev --prefix server" "npm run dev --prefix client"
