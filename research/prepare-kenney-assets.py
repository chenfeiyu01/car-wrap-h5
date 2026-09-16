"""Prepare two known CC0 Kenney assets; this is an offline asset utility.

Preserves geometry. Splits painted palette faces into a dedicated primitive,
embeds the original palette PNG, and records exact source/target bindings.
The palette rules apply only to the checked Car Kit 3.1 source files.
"""
from __future__ import annotations

import collections
import hashlib
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "assets" / "models"
EXPECTED_HASHES = {
    "sedan": "b532ea7d2c59f7f6b22b138cf1955218a2c1898f1cea932af4d3fd563c3959b7",
    "suv": "9df31f6e89e927a8176fc792aa125f0b19dc1ba29d2025bfef7c4f4d6ab1778a",
}


def prepare(name: str, u_min: float, u_max: float) -> dict:
    source = MODEL_DIR / f"kenney-{name}.glb"
    raw = source.read_bytes()
    source_hash = hashlib.sha256(raw).hexdigest()
    if source_hash != EXPECTED_HASHES[name]:
        raise ValueError(f"Unexpected source version: {source.name}")
    magic, version, length = struct.unpack_from("<4sII", raw)
    if (magic, version, length) != (b"glTF", 2, len(raw)):
        raise ValueError("Invalid GLB header")
    json_length, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A:
        raise ValueError("Missing JSON chunk")
    document = json.loads(raw[20:20 + json_length])
    offset = 20 + json_length
    bin_length, bin_type = struct.unpack_from("<II", raw, offset)
    if bin_type != 0x004E4942:
        raise ValueError("Missing BIN chunk")
    binary = bytearray(raw[offset + 8:offset + 8 + bin_length])

    def accessor(index: int) -> list[tuple]:
        item = document["accessors"][index]
        view = document["bufferViews"][item["bufferView"]]
        if item.get("sparse") or item.get("normalized") or view["buffer"] != 0:
            raise ValueError("Unexpected accessor layout")
        width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[item["type"]]
        fmt = {5126: "f", 5125: "I", 5123: "H", 5121: "B"}[item["componentType"]]
        stride = view.get("byteStride", struct.calcsize(fmt) * width)
        start = view.get("byteOffset", 0) + item.get("byteOffset", 0)
        return [struct.unpack_from("<" + fmt * width, binary, start + i * stride)
                for i in range(item["count"])]

    def append_view(data: bytes, target: int | None = None) -> int:
        binary.extend(b"\0" * (-len(binary) % 4))
        view = {"buffer": 0, "byteOffset": len(binary), "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        document["bufferViews"].append(view)
        binary.extend(data)
        return len(document["bufferViews"]) - 1

    def append_indices(indices: list[int]) -> int:
        view = append_view(struct.pack("<" + "I" * len(indices), *indices), 34963)
        document["accessors"].append({"bufferView": view, "componentType": 5125,
            "count": len(indices), "type": "SCALAR", "min": [min(indices)], "max": [max(indices)]})
        return len(document["accessors"]) - 1

    body_mesh_index = next(i for i, mesh in enumerate(document["meshes"])
                           if mesh.get("name") == "body")
    body = document["meshes"][body_mesh_index]
    if len(body["primitives"]) != 1:
        raise ValueError("Unexpected body primitive count")
    original = body["primitives"][0]
    uv = accessor(original["attributes"]["TEXCOORD_0"])
    original_indices = [value[0] for value in accessor(original["indices"])]
    paint, trim = [], []
    for index in range(0, len(original_indices), 3):
        triangle = original_indices[index:index + 3]
        in_paint = [u_min <= uv[v][0] < u_max and 0.25 <= uv[v][1] < 0.5 for v in triangle]
        if any(in_paint) and not all(in_paint):
            raise ValueError("A triangle crosses the selected palette cell")
        (paint if all(in_paint) else trim).extend(triangle)
    if not paint or not trim:
        raise ValueError("Paint and trim must both remain present")
    if collections.Counter(original_indices) != collections.Counter(paint + trim):
        raise ValueError("Geometry index coverage changed")

    paint_material = len(document["materials"])
    document["materials"].append({"name": "body_paint", "doubleSided": True,
        "pbrMetallicRoughness": {"baseColorFactor": [0.8, 0.8, 0.8, 1],
                                "metallicFactor": 0, "roughnessFactor": 0.3}})
    trim_primitive = dict(original)
    trim_primitive["indices"] = append_indices(trim)
    paint_primitive = dict(original)
    paint_primitive["indices"] = append_indices(paint)
    paint_primitive["material"] = paint_material
    body["primitives"] = [trim_primitive, paint_primitive]

    for image in document.get("images", []):
        if image.get("uri") != "Textures/colormap.png":
            raise ValueError("Unexpected texture reference")
        image["bufferView"] = append_view((MODEL_DIR / "Textures" / "colormap.png").read_bytes())
        image["mimeType"] = "image/png"
        del image["uri"]
    document["buffers"][0]["byteLength"] = len(binary)
    document["asset"]["generator"] = "Car Kit 3.1; car-wrap offline palette split v1"
    document["asset"]["copyright"] = "Kenney, CC0 1.0; see Kenney-Car-Kit-License.txt"
    encoded = json.dumps(document, separators=(",", ":")).encode()
    encoded += b" " * (-len(encoded) % 4)
    binary.extend(b"\0" * (-len(binary) % 4))
    out = struct.pack("<4sII", b"glTF", 2, 12 + 8 + len(encoded) + 8 + len(binary))
    out += struct.pack("<II", len(encoded), 0x4E4F534A) + encoded
    out += struct.pack("<II", len(binary), 0x004E4942) + binary
    destination = MODEL_DIR / f"kenney-{name}-prepared.glb"
    destination.write_bytes(out)
    node_index = next(i for i, node in enumerate(document["nodes"])
                      if node.get("mesh") == body_mesh_index)
    total_triangles = sum(document["accessors"][p["indices"]]["count"] // 3
                          for mesh in document["meshes"] for p in mesh["primitives"])
    return {"id": f"kenney-{name}", "source": str(source.relative_to(ROOT)),
        "sourceSha256": source_hash, "model": str(destination.relative_to(ROOT)),
        "sha256": hashlib.sha256(out).hexdigest(), "bytes": len(out),
        "triangles": total_triangles, "paintTriangles": len(paint) // 3,
        "bodyTrimTriangles": len(trim) // 3,
        "paintTarget": {"nodeName": "body", "nodeIndex": node_index,
                        "meshIndex": body_mesh_index, "primitiveIndex": 1,
                        "materialIndex": paint_material, "materialName": "body_paint"},
        "externalUris": [], "geometryPreserved": True,
        "limitation": "Only the original colored exterior panels are paintable; stock neutral trim/roof stays fixed. Palette UVs are not wrap-art UVs."}


if __name__ == "__main__":
    records = [prepare("sedan", 0.75, 0.875), prepare("suv", 0.375, 0.5)]
    output = ROOT / "research" / "prepared-model-bindings.json"
    output.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(records, ensure_ascii=False, indent=2))
