"""
Build a stylized phone + floating social icons scene using the site
neon-black theme (globals.css / ADTRAXIO aurora palette).

Run headless:
  blender --background --python build_phone_social_scene.py
"""

from __future__ import annotations

import math
import os
import sys

import bpy
from mathutils import Euler, Vector

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
if SCRIPT_DIR not in sys.path:
    sys.path.insert(0, SCRIPT_DIR)

from theme_colors import (  # noqa: E402
    ACCENT,
    BACKGROUND,
    BACKGROUND_ALT,
    SURFACE,
    SURFACE_ELEVATED,
    SURFACE_TINT,
    hex_to_rgba01,
)

WEB_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
TEXTURE_DIR = os.path.join(SCRIPT_DIR, "textures")
OUTPUT_BLEND = os.path.join(SCRIPT_DIR, "phone-social-studio.blend")
OUTPUT_GLB = os.path.join(WEB_ROOT, "public", "models", "phone-social-studio.glb")


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def set_render_engine() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 64


def load_image(path: str):
    if not os.path.isfile(path):
        raise FileNotFoundError(f"Missing texture: {path}")
    return bpy.data.images.load(path, check_existing=True)


def make_principled_material(
    name: str,
    base_color=(0.8, 0.8, 0.8, 1.0),
    roughness: float = 0.35,
    metallic: float = 0.0,
    emission_strength: float = 0.0,
    image=None,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Base Color"].default_value = base_color

    if image is not None:
        tex = nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Linear"
        links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
        if emission_strength > 0:
            links.new(tex.outputs["Color"], bsdf.inputs["Emission Color"])
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    elif emission_strength > 0:
        bsdf.inputs["Emission Color"].default_value = base_color
        bsdf.inputs["Emission Strength"].default_value = emission_strength

    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    return mat


def add_rounded_tile(
    name: str,
    size: float,
    location: Vector,
    rotation: Euler,
    material: bpy.types.Material,
    bevel_width: float = 0.012,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=size, location=location)
    obj = bpy.context.active_object
    obj.name = name
    obj.rotation_euler = rotation
    obj.scale = (0.85, 0.12, 0.85)

    bevel = obj.modifiers.new(name="Bevel", type="BEVEL")
    bevel.width = bevel_width
    bevel.segments = 3
    bevel.limit_method = "ANGLE"

    obj.data.materials.append(material)
    bpy.ops.object.shade_smooth()
    return obj


def build_phone(screen_mat: bpy.types.Material, body_mat: bpy.types.Material) -> bpy.types.Object:
    # Body
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 1.05))
    phone = bpy.context.active_object
    phone.name = "Phone"
    phone.scale = (0.34, 0.045, 0.72)
    phone.rotation_euler = Euler((math.radians(-8), math.radians(18), math.radians(12)), "XYZ")

    bevel = phone.modifiers.new(name="Bevel", type="BEVEL")
    bevel.width = 0.018
    bevel.segments = 4
    phone.data.materials.append(body_mat)
    bpy.ops.object.shade_smooth()

    # Screen inset
    screen_loc = phone.matrix_world @ Vector((0, -0.52, 0.02))
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=screen_loc)
    screen = bpy.context.active_object
    screen.name = "PhoneScreen"
    screen.scale = (0.30, 0.008, 0.64)
    screen.rotation_euler = phone.rotation_euler
    screen.data.materials.append(screen_mat)
    bpy.ops.object.shade_smooth()

    # Notch
    notch_loc = phone.matrix_world @ Vector((0, -0.53, 0.34))
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=notch_loc)
    notch = bpy.context.active_object
    notch.name = "PhoneNotch"
    notch.scale = (0.11, 0.01, 0.035)
    notch.rotation_euler = phone.rotation_euler
    notch.data.materials.append(body_mat)

    return phone


def build_icons() -> None:
    ig_img = load_image(os.path.join(TEXTURE_DIR, "instagram.png"))
    tw_img = load_image(os.path.join(TEXTURE_DIR, "twitter.png"))
    fb_img = load_image(os.path.join(TEXTURE_DIR, "facebook.png"))

    icon_emission = 0.28
    ig_mat = make_principled_material(
        "MatInstagram", image=ig_img, roughness=0.18, emission_strength=icon_emission
    )
    tw_mat = make_principled_material(
        "MatTwitter", image=tw_img, roughness=0.18, emission_strength=icon_emission
    )
    fb_mat = make_principled_material(
        "MatFacebook", image=fb_img, roughness=0.18, emission_strength=icon_emission
    )

    placements = [
        ("IconInstagram_A", ig_mat, Vector((0.55, -0.05, 1.55)), Euler((0.3, 0.4, -0.6)), 0.22),
        ("IconInstagram_B", ig_mat, Vector((0.72, 0.08, 1.25)), Euler((-0.2, 0.8, 0.5)), 0.18),
        ("IconInstagram_C", ig_mat, Vector((0.35, 0.12, 1.72)), Euler((0.6, -0.3, 1.1)), 0.16),
        ("IconTwitter_A", tw_mat, Vector((-0.25, 0.05, 1.35)), Euler((0.1, -0.5, 0.2)), 0.17),
        ("IconTwitter_B", tw_mat, Vector((0.62, -0.12, 0.95)), Euler((-0.4, 0.2, -0.8)), 0.15),
        ("IconFacebook_A", fb_mat, Vector((0.48, 0.15, 0.82)), Euler((0.5, 0.6, -0.2)), 0.19),
    ]

    for name, mat, loc, rot, size in placements:
        add_rounded_tile(name, size, loc, rot, mat)


def build_neon_world() -> None:
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    nodes = world.node_tree.nodes
    links = world.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputWorld")
    background = nodes.new("ShaderNodeBackground")
    background.inputs["Color"].default_value = hex_to_rgba01(BACKGROUND)
    background.inputs["Strength"].default_value = 1.0
    links.new(background.outputs["Background"], output.inputs["Surface"])


def build_aurora_backdrop() -> None:
    mat = bpy.data.materials.new("MatAuroraBackdrop")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    tex_coord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    gradient = nodes.new("ShaderNodeTexGradient")
    gradient.gradient_type = "RADIAL"
    ramp = nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = hex_to_rgba01(ACCENT, 0.22)
    ramp.color_ramp.elements[1].position = 1.0
    ramp.color_ramp.elements[1].color = hex_to_rgba01(BACKGROUND, 0.0)

    links.new(tex_coord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], gradient.inputs["Vector"])
    links.new(gradient.outputs["Fac"], ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], emission.inputs["Color"])
    emission.inputs["Strength"].default_value = 1.35
    links.new(emission.outputs["Emission"], output.inputs["Surface"])

    bpy.ops.mesh.primitive_plane_add(size=7.5, location=(0.2, 2.6, 2.35))
    backdrop = bpy.context.active_object
    backdrop.name = "AuroraBackdrop"
    backdrop.rotation_euler = Euler((math.radians(72), 0, math.radians(8)), "XYZ")
    backdrop.data.materials.append(mat)


def build_studio() -> None:
    build_neon_world()

    mat_floor = make_principled_material(
        "MatStudioFloor",
        base_color=hex_to_rgba01(SURFACE),
        roughness=0.55,
        metallic=0.08,
    )
    mat_wall = make_principled_material(
        "MatStudioWall",
        base_color=hex_to_rgba01(SURFACE_TINT),
        roughness=0.65,
        metallic=0.04,
    )

    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0))
    floor = bpy.context.active_object
    floor.name = "StudioFloor"
    floor.data.materials.append(mat_floor)

    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 2.8, 3.0))
    wall = bpy.context.active_object
    wall.name = "StudioWall"
    wall.rotation_euler = Euler((math.radians(90), 0, 0), "XYZ")
    wall.data.materials.append(mat_wall)

    build_aurora_backdrop()


def setup_lighting() -> None:
    accent_rgb = hex_to_rgba01(ACCENT)[:3]

    bpy.ops.object.light_add(type="AREA", location=(-2.0, -1.2, 3.2))
    key = bpy.context.active_object
    key.name = "KeyLight"
    key.data.energy = 520
    key.data.size = 2.4
    key.data.color = accent_rgb
    key.rotation_euler = Euler((math.radians(58), math.radians(-12), math.radians(-22)), "XYZ")

    bpy.ops.object.light_add(type="AREA", location=(2.2, 0.8, 1.8))
    fill = bpy.context.active_object
    fill.name = "FillLight"
    fill.data.energy = 95
    fill.data.size = 4.0
    fill.data.color = (0.75, 0.78, 0.82)
    fill.rotation_euler = Euler((math.radians(68), math.radians(20), math.radians(8)), "XYZ")

    bpy.ops.object.light_add(type="AREA", location=(0.0, -2.5, 0.4))
    rim = bpy.context.active_object
    rim.name = "RimLight"
    rim.data.energy = 140
    rim.data.size = 3.0
    rim.data.color = accent_rgb
    rim.rotation_euler = Euler((math.radians(25), 0, 0), "XYZ")


def setup_camera() -> None:
    cam_data = bpy.data.cameras.new("Camera")
    cam = bpy.data.objects.new("Camera", cam_data)
    bpy.context.collection.objects.link(cam)
    bpy.context.scene.camera = cam
    cam.location = Vector((0.15, -2.35, 1.05))
    cam.rotation_euler = Euler((math.radians(72), 0, math.radians(2)), "XYZ")
    cam.data.lens = 50


def export_assets() -> None:
    os.makedirs(os.path.dirname(OUTPUT_GLB), exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=OUTPUT_BLEND)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB,
        export_format="GLB",
        use_selection=False,
        export_apply=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
    )
    print(f"Saved blend: {OUTPUT_BLEND}")
    print(f"Exported GLB: {OUTPUT_GLB}")


def main() -> None:
    clear_scene()
    set_render_engine()

    screen_img = load_image(os.path.join(TEXTURE_DIR, "phone_screen.png"))
    screen_mat = make_principled_material(
        "MatPhoneScreen", image=screen_img, roughness=0.12, emission_strength=0.95
    )
    body_mat = make_principled_material(
        "MatPhoneBody",
        base_color=hex_to_rgba01(BACKGROUND_ALT),
        roughness=0.28,
        metallic=0.42,
    )

    build_studio()
    build_phone(screen_mat, body_mat)
    build_icons()
    setup_lighting()
    setup_camera()
    export_assets()


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        raise
