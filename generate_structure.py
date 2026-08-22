#!/usr/bin/env python3
"""
Auto-generate structure.json from the current directory structure.
This script scans the src/ directory and creates a JSON structure
for the content blog navigation.

Markdown files may carry an optional YAML front-matter block, which is lifted into the
generated structure so the site can show a real title, a summary and tags without
downloading every document first:

    ---
    title: Language Fundamentals
    summary: Type system, generics, LINQ and CLR internals.
    tags: [csharp, clr, interview]
    updated: 2026-08-22
    ---

`tags` accepts either the inline `[a, b]` form or a YAML list. A document with no
front-matter tags is tagged from its folder path instead, so every page is reachable
from the tag index whether or not anyone has annotated it yet.
"""

import os
import json
import argparse
import re
from pathlib import Path

# Front matter is only recognised at the very top of the file, fenced by --- on its own line.
FRONT_MATTER = re.compile(r'^﻿?---[ \t]*\r?\n(.*?)\r?\n---[ \t]*(?:\r?\n|$)', re.DOTALL)

MARKDOWN_EXTENSIONS = {'.md', '.markdown'}

def should_include_file(file_path):
    """Check if a file should be included in the structure."""
    # Include markdown files and some other formats
    allowed_extensions = {'.md', '.txt', '.html', '.json'}
    return file_path.suffix.lower() in allowed_extensions

def should_include_directory(dir_name):
    """Check if a directory should be included in the structure."""
    # Exclude common build/cache directories
    excluded_dirs = {'.git', '.vscode', '__pycache__', 'node_modules', 'bin', 'obj'}
    return dir_name not in excluded_dirs and not dir_name.startswith('.')

def _strip_quotes(value):
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in ('"', "'"):
        return value[1:-1]
    return value

def _split_list(value):
    """Parse the inline [a, b] form, tolerating quotes and a trailing comma."""
    inner = value.strip()
    if inner.startswith('[') and inner.endswith(']'):
        inner = inner[1:-1]
    return [_strip_quotes(part) for part in inner.split(',') if part.strip()]

def parse_front_matter(text):
    """
    Read the leading --- block as a flat mapping.

    Deliberately a small hand-rolled reader rather than a YAML dependency: the block only ever
    holds scalars and one-level string lists, and the generator must run from a bare checkout
    with nothing installed. Anything it cannot parse is skipped rather than raising, so a typo
    in one document never breaks the whole navigation build.
    """
    match = FRONT_MATTER.match(text)
    if not match:
        return {}

    data = {}
    pending_list_key = None

    for raw_line in match.group(1).splitlines():
        line = raw_line.rstrip()
        if not line.strip() or line.strip().startswith('#'):
            continue

        # A "- item" line continues the list opened by the previous "key:" line.
        stripped = line.strip()
        if pending_list_key and stripped.startswith('- '):
            data[pending_list_key].append(_strip_quotes(stripped[2:]))
            continue

        if ':' not in line:
            continue

        key, _, value = line.partition(':')
        key = key.strip().lower()
        value = value.strip()
        pending_list_key = None

        if not value:
            # "key:" alone opens a YAML list; the following "- item" lines fill it.
            data[key] = []
            pending_list_key = key
        elif value.startswith('['):
            data[key] = _split_list(value)
        else:
            data[key] = _strip_quotes(value)

    return data

def strip_front_matter(text):
    """The document body with its front-matter block removed."""
    return FRONT_MATTER.sub('', text, count=1)

def first_heading(text):
    """The first "# heading" in the document, used as a title when front matter omits one."""
    for line in strip_front_matter(text).splitlines():
        if line.startswith('# '):
            return line[2:].strip()
    return None

def normalize_tag(tag):
    """Trim and collapse whitespace; casing is left to the author."""
    return ' '.join(str(tag).split())

def derive_tags(relative_path):
    """
    Fallback tags for a document with no front matter: the folders it lives in.

    Interview-Prep/01-language-fundamentals.md becomes ['Interview-Prep']. The file's own name
    is never a tag - that is the title's job, and it would make every tag unique.
    """
    return [normalize_tag(part) for part in relative_path.parent.parts if part not in ('.', '')]

def read_document_metadata(path, base_path):
    """Title / summary / tags for one markdown file. Never raises: metadata is a nicety."""
    relative_path = path.relative_to(base_path)
    meta = {}

    if path.suffix.lower() in MARKDOWN_EXTENSIONS:
        try:
            text = path.read_text(encoding='utf-8')
        except (OSError, UnicodeDecodeError) as e:
            print(f"  Warning: could not read {relative_path}: {e}")
            text = ''

        front = parse_front_matter(text)

        title = front.get('title') or first_heading(text)
        if isinstance(title, str) and title.strip():
            meta['title'] = title.strip()

        summary = front.get('summary') or front.get('description')
        if isinstance(summary, str) and summary.strip():
            meta['summary'] = summary.strip()

        updated = front.get('updated') or front.get('date')
        if isinstance(updated, str) and updated.strip():
            meta['updated'] = updated.strip()

        raw_tags = front.get('tags')
        if isinstance(raw_tags, str):
            raw_tags = _split_list(raw_tags) if raw_tags.startswith('[') else [raw_tags]
        tags = [normalize_tag(t) for t in (raw_tags or []) if normalize_tag(t)]
    else:
        tags = []

    if not tags:
        tags = derive_tags(relative_path)

    # De-duplicate case-insensitively while keeping the author's spelling and order.
    seen = set()
    unique = []
    for tag in tags:
        key = tag.lower()
        if key not in seen:
            seen.add(key)
            unique.append(tag)

    meta['tags'] = unique
    return meta

def create_structure_item(path, base_path):
    """Create a structure item from a file or directory path."""
    relative_path = path.relative_to(base_path)
    # Convert path to forward slashes
    path_str = str(relative_path).replace('\\', '/')

    if path.is_file():
        item = {
            "name": path.name,
            "path": f"src/{path_str}",  # Add src/ prefix
            "isDirectory": False
        }
        item.update(read_document_metadata(path, base_path))
        return item
    else:
        children = []
        try:
            # Sort items: directories first, then files, both alphabetically
            items = sorted(path.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))

            for item in items:
                if item.is_file() and should_include_file(item):
                    children.append(create_structure_item(item, base_path))
                elif item.is_dir() and should_include_directory(item.name):
                    child_structure = create_structure_item(item, base_path)
                    if child_structure["children"]:  # Only include directories with content
                        children.append(child_structure)
        except PermissionError:
            print(f"Permission denied accessing {path}")

        return {
            "name": path.name,
            "path": f"src/{path_str}",  # Add src/ prefix
            "isDirectory": True,
            "children": children
        }

def generate_structure_json(src_dir="src", output_file="structure.json"):
    """Generate the structure.json file from the src directory."""
    base_path = Path(src_dir)

    if not base_path.exists():
        print(f"Error: Directory '{src_dir}' does not exist")
        return False

    if not base_path.is_dir():
        print(f"Error: '{src_dir}' is not a directory")
        return False

    print(f"Scanning directory: {base_path.absolute()}")

    # Create the root structure
    structure = {
        "name": "src",
        "path": "src",  # Add src path for root
        "isDirectory": True,
        "children": []
    }

    try:
        # Sort items: directories first, then files, both alphabetically
        items = sorted(base_path.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))

        for item in items:
            if item.is_file() and should_include_file(item):
                structure["children"].append(create_structure_item(item, base_path))
            elif item.is_dir() and should_include_directory(item.name):
                child_structure = create_structure_item(item, base_path)
                if child_structure["children"]:  # Only include directories with content
                    structure["children"].append(child_structure)
    except PermissionError:
        print(f"Permission denied accessing {base_path}")
        return False

    # Write the structure to JSON file
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(structure, f, indent=2, ensure_ascii=False)

        print(f"Successfully generated {output_file}")
        print(f"Found {count_items(structure)} items")
        print(f"{count_tags(structure)} distinct tags")
        return True

    except Exception as e:
        print(f"Error writing {output_file}: {e}")
        return False

def count_items(structure):
    """Count total items in the structure."""
    count = 1  # Count the current item
    if structure.get("children"):
        for child in structure["children"]:
            count += count_items(child)
    return count

def count_tags(structure):
    """Count the distinct tags across the whole tree, matched case-insensitively."""
    tags = set()

    def walk(node):
        for tag in node.get("tags") or []:
            tags.add(tag.lower())
        for child in node.get("children") or []:
            walk(child)

    walk(structure)
    return len(tags)

def watch_directory(src_dir="src", output_file="structure.json", interval=2):
    """Watch the directory for changes and regenerate structure.json."""
    import time
    import hashlib

    def get_dir_hash(path):
        """Hash the directory structure AND each file's mtime, so an edited tag list
        regenerates the output just like an added document does."""
        hash_md5 = hashlib.md5()
        try:
            for root, dirs, files in os.walk(path):
                # Sort for consistent hashing
                dirs.sort()
                files.sort()

                for name in files:
                    file_path = Path(root) / name
                    if should_include_file(file_path):
                        hash_md5.update(f"{root}/{name}".encode('utf-8'))
                        try:
                            hash_md5.update(str(file_path.stat().st_mtime_ns).encode('utf-8'))
                        except OSError:
                            pass

                for name in dirs:
                    if should_include_directory(name):
                        hash_md5.update(f"{root}/{name}/".encode('utf-8'))
        except Exception as e:
            print(f"Error calculating hash: {e}")

        return hash_md5.hexdigest()

    print(f"Watching {src_dir} for changes (Ctrl+C to stop)...")

    # Initial generation
    generate_structure_json(src_dir, output_file)
    last_hash = get_dir_hash(src_dir)

    try:
        while True:
            time.sleep(interval)
            current_hash = get_dir_hash(src_dir)

            if current_hash != last_hash:
                print(f"Changes detected, regenerating {output_file}...")
                if generate_structure_json(src_dir, output_file):
                    last_hash = current_hash
                else:
                    print("Failed to regenerate structure.json")

    except KeyboardInterrupt:
        print("\nStopped watching directory")

def main():
    parser = argparse.ArgumentParser(description='Generate structure.json for content blog')
    parser.add_argument('--src', default='src', help='Source directory to scan (default: src)')
    parser.add_argument('--output', default='structure.json', help='Output file (default: structure.json)')
    parser.add_argument('--watch', action='store_true', help='Watch directory for changes')
    parser.add_argument('--interval', type=int, default=2, help='Watch interval in seconds (default: 2)')

    args = parser.parse_args()

    if args.watch:
        watch_directory(args.src, args.output, args.interval)
    else:
        success = generate_structure_json(args.src, args.output)
        exit(0 if success else 1)

if __name__ == "__main__":
    main()
