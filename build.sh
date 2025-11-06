#!/bin/bash
set -e

# Install Rust if not already installed (needed for tiktoken)
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Install Python dependencies
pip install --upgrade pip
pip install -r requirements.txt

