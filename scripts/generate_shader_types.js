const fs = require("fs");
const path = require("path");

function toPascalCase(str) {
    return str
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
        .replace(/^[a-z]/, (chr) => chr.toUpperCase());
}

function mapGLSLTypeToTS(glslType) {
    switch (glslType) {
        case "float":
        case "int":
        case "uint":
            return "number";
        case "bool":
            return "boolean";
        case "vec2":
            return "[number, number]";
        case "vec3":
            return "[number, number, number]";
        case "vec4":
            return "[number, number, number, number]";
        case "mat3":
        case "mat4":
            return "Float32Array | number[]";
        case "sampler2D":
        case "samplerCube":
            return "number";
        default:
            return "unknown";
    }
}

/**
 * Standard registry of authorized sampler uniform names mapped to the 16 TextureUnit slots.
 * Ensures consistent naming across shaders and automated texture unit reflection.
 */
const VALID_SAMPLER_NAMES = new Set([
    // Diffuse / Color 0
    "u_texture",
    "u_diffuseMap",
    "u_colorMap",
    "u_colorMap0",
    "u_texture0",

    // Diffuse / Color 1
    "u_colorMap1",
    "u_texture1",
    "u_diffuseMap1",

    // Diffuse / Color 2
    "u_colorMap2",
    "u_texture2",
    "u_diffuseMap2",

    // Diffuse / Color 3
    "u_colorMap3",
    "u_texture3",
    "u_diffuseMap3",

    // PBR Channels
    "u_normalMap",
    "u_roughnessMap",
    "u_metallicMap",
    "u_metalnessMap",
    "u_emissiveMap",
    "u_aoMap",
    "u_occlusionMap",

    // Surface & Details
    "u_heightMap",
    "u_bumpMap",
    "u_maskMap",
    "u_splatMap",
    "u_blendMask",

    // Environment & Advanced
    "u_envMap",
    "u_irradianceMap",
    "u_shadowMap",
    "u_transmissionMap",
    "u_thicknessMap",
    "u_brdfLut",
    "u_lutMap",
    "u_noiseMap",
    "u_flowMap",
    "u_distortionMap",
]);

function validateShaderSamplers(filePath, source) {
    if (!source) return [];
    const lines = source.split(/\r?\n/);
    const samplerRegex = /uniform\s+(?:lowp\s+|mediump\s+|highp\s+)?(sampler2D|samplerCube|sampler2DArray|sampler3D)\s+([a-zA-Z0-9_]+)\s*;/;
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = line.match(samplerRegex);
        if (match) {
            const samplerName = match[2];
            if (!VALID_SAMPLER_NAMES.has(samplerName)) {
                errors.push({
                    file: path.relative(process.cwd(), filePath),
                    line: i + 1,
                    samplerName,
                    type: match[1],
                });
            }
        }
    }
    return errors;
}

function parseUniformsFromGLSL(source) {
    const uniformRegex = /uniform\s+(\w+)\s+(\w+)(?:\s*\[\s*\d+\s*\])?\s*;/g;
    const uniforms = [];
    let match;

    while ((match = uniformRegex.exec(source)) !== null) {
        uniforms.push({
            type: match[1],
            name: match[2],
        });
    }

    return uniforms;
}

function findShaderFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            findShaderFiles(filePath, fileList);
        } else if (file.endsWith(".vert") || file.endsWith(".frag")) {
            fileList.push(filePath);
        }
    }

    return fileList;
}

function processShaderGroup(basePath, vertPath, fragPath, allValidationErrors) {
    const baseName = path.basename(basePath);
    const pascalBase = toPascalCase(baseName);
    const combinedInterfaceName = `${pascalBase}Uniforms`;

    const vertSource = vertPath ? fs.readFileSync(vertPath, "utf-8") : "";
    const fragSource = fragPath ? fs.readFileSync(fragPath, "utf-8") : "";

    if (vertPath) {
        const errors = validateShaderSamplers(vertPath, vertSource);
        allValidationErrors.push(...errors);
    }
    if (fragPath) {
        const errors = validateShaderSamplers(fragPath, fragSource);
        allValidationErrors.push(...errors);
    }

    const vertUniforms = vertSource ? parseUniformsFromGLSL(vertSource) : [];
    const fragUniforms = fragSource ? parseUniformsFromGLSL(fragSource) : [];

    // Process Vertex Shader .d.ts
    if (vertPath) {
        const vertInterfaceName = `${pascalBase}VertUniforms`;
        const lines = [
            "/* Auto-generated transparent shader ambient type declarations */",
            "declare const shaderSource: string;",
            "export default shaderSource;",
            "",
            `export interface ${vertInterfaceName} {`,
        ];

        for (const u of vertUniforms) {
            lines.push(`    ${u.name}: ${mapGLSLTypeToTS(u.type)};`);
        }
        lines.push("}");
        lines.push("");

        // Combined interface export
        if (fragPath) {
            const fragInterfaceName = `${pascalBase}FragUniforms`;
            lines.push(`export interface ${fragInterfaceName} {`);
            for (const u of fragUniforms) {
                lines.push(`    ${u.name}: ${mapGLSLTypeToTS(u.type)};`);
            }
            lines.push("}");
            lines.push("");
            lines.push(`export type ${combinedInterfaceName} = ${vertInterfaceName} & ${fragInterfaceName};`);
        } else {
            lines.push(`export type ${combinedInterfaceName} = ${vertInterfaceName};`);
        }
        lines.push("");

        writeDtsIfChanged(`${vertPath}.d.ts`, lines.join("\n"));
    }

    // Process Fragment Shader .d.ts
    if (fragPath) {
        const fragInterfaceName = `${pascalBase}FragUniforms`;
        const lines = [
            "/* Auto-generated transparent shader ambient type declarations */",
            "declare const shaderSource: string;",
            "export default shaderSource;",
            "",
            `export interface ${fragInterfaceName} {`,
        ];

        for (const u of fragUniforms) {
            lines.push(`    ${u.name}: ${mapGLSLTypeToTS(u.type)};`);
        }
        lines.push("}");
        lines.push("");

        // Combined interface export
        if (vertPath) {
            const vertInterfaceName = `${pascalBase}VertUniforms`;
            lines.push(`export interface ${vertInterfaceName} {`);
            for (const u of vertUniforms) {
                lines.push(`    ${u.name}: ${mapGLSLTypeToTS(u.type)};`);
            }
            lines.push("}");
            lines.push("");
            lines.push(`export type ${combinedInterfaceName} = ${vertInterfaceName} & ${fragInterfaceName};`);
        } else {
            lines.push(`export type ${combinedInterfaceName} = ${fragInterfaceName};`);
        }
        lines.push("");

        writeDtsIfChanged(`${fragPath}.d.ts`, lines.join("\n"));
    }
}

function writeDtsIfChanged(dtsPath, newContent) {
    if (!fs.existsSync(dtsPath) || fs.readFileSync(dtsPath, "utf-8") !== newContent) {
        fs.writeFileSync(dtsPath, newContent, "utf-8");
        console.log(`[generate:shaders] Updated ${path.relative(process.cwd(), dtsPath)}`);
    }
}

function main() {
    const srcDir = path.join(__dirname, "..", "src");
    if (!fs.existsSync(srcDir)) return;

    const shaderFiles = findShaderFiles(srcDir);
    const groups = new Map(); // key: basePath without .vert or .frag

    for (const file of shaderFiles) {
        const basePath = file.replace(/\.(vert|frag)$/, "");
        if (!groups.has(basePath)) {
            groups.set(basePath, {});
        }
        if (file.endsWith(".vert")) groups.get(basePath).vert = file;
        if (file.endsWith(".frag")) groups.get(basePath).frag = file;
    }

    console.log(`[generate:shaders] Found ${groups.size} shader program pairs.`);

    const allValidationErrors = [];

    for (const [basePath, pair] of groups.entries()) {
        processShaderGroup(basePath, pair.vert, pair.frag, allValidationErrors);
    }

    if (allValidationErrors.length > 0) {
        console.error("\n[generate:shaders] ❌ Shader Sampler Validation FAILED:");
        for (const err of allValidationErrors) {
            console.error(`  - ${err.file}:${err.line} -> Unknown ${err.type} "${err.samplerName}"`);
        }
        console.error("\n  All samplers must conform to the 16 standard TextureUnit slots:");
        console.error("    - Color0..3:  u_texture, u_colorMap0..3, u_diffuseMap[1..3], u_texture0..3");
        console.error("    - PBR Maps:   u_normalMap, u_roughnessMap, u_metallicMap, u_emissiveMap, u_aoMap");
        console.error("    - Detail:     u_heightMap, u_bumpMap, u_maskMap, u_splatMap, u_blendMask");
        console.error("    - Scene/Env:  u_envMap, u_irradianceMap, u_shadowMap");
        console.error("    - Advanced:   u_transmissionMap, u_thicknessMap, u_brdfLut, u_lutMap, u_noiseMap, u_flowMap, u_distortionMap\n");
        process.exit(1);
    }
}

main();
