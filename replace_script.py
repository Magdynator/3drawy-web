import os
import glob

src_dir = "/home/magdy/Desktop/adrawya/src"
files = glob.glob(src_dir + "/**/*.tsx", recursive=True)
files += glob.glob(src_dir + "/**/*.css", recursive=True)
files += glob.glob(src_dir + "/**/*.ts", recursive=True)

modified_count = 0
for filepath in files:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    new_content = content.replace("kahoot", "zingoo").replace("Kahoot", "Zingoo").replace("KAHOOT", "ZINGOO")
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        modified_count += 1
        print("Modified", filepath)

print("Done modifying", modified_count, "files")
