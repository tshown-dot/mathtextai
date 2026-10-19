#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install Python requirements
pip install -r requirements.txt

# Ensure pandoc is available on Render
if ! command -v pandoc &> /dev/null
then
    echo "Pandoc not found in PATH. Downloading standalone Pandoc binary for Linux..."
    PANDOC_VERSION="3.1.11.1"
    wget -q "https://github.com/jgm/pandoc/releases/download/${PANDOC_VERSION}/pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz"
    tar -xzf "pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz"
    mkdir -p bin
    cp "pandoc-${PANDOC_VERSION}/bin/pandoc" bin/
    rm -rf "pandoc-${PANDOC_VERSION}*"
    chmod +x bin/pandoc
    export PATH="$(pwd)/bin:$PATH"
    echo "Pandoc installed successfully to $(pwd)/bin/pandoc"
fi
