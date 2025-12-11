import json
import os

notebook_path = r"c:\Users\abdul\OneDrive\Desktop\Oricalo\backend\training\price_model_experiment.ipynb"
output_path = r"c:\Users\abdul\OneDrive\Desktop\Oricalo\backend\training\train_final.py"

with open(notebook_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

code_cells = []
for cell in nb["cells"]:
    if cell["cell_type"] == "code":
        source = "".join(cell["source"])
        # Basic cleanup: comment out magics
        source_lines = source.splitlines()
        cleaned_lines = []
        for line in source_lines:
            if line.strip().startswith("!") or line.strip().startswith("%"):
                cleaned_lines.append("# " + line)
            else:
                cleaned_lines.append(line)
        code_cells.append("\n".join(cleaned_lines))

full_script = "\n\n# --- CELL ---\n\n".join(code_cells)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(full_script)

print(f"Converted {notebook_path} to {output_path}")
