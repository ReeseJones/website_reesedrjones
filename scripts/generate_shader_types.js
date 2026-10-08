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
    const uniformRegex = /uniform\s+(?:lowp\s+|mediump\s+|highp\s+)?(\w+)\s+(\w+)(?:\s*\[\s*\d+\s*\])?\s*;/g;
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

function parseInputsFromVertGLSL(source) {
    // Matches: layout(location = N) in [qualifiers] type name;
    // or: in [qualifiers] type name;
    const lines = source.split(/\r?\n/);
    const inputs = [];
    const layoutRegex = /^\s*layout\s*\(\s*location\s*=\s*(\d+)\s*\)\s*in\s+(?:(?:lowp|mediump|highp)\s+)*(\w+)\s+(\w+)\s*;/;
    const plainInRegex = /^\s*in\s+(?:(?:lowp|mediump|highp)\s+)*(\w+)\s+(\w+)\s*;/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

        const layoutMatch = trimmed.match(layoutRegex);
        if (layoutMatch) {
            inputs.push({
                location: parseInt(layoutMatch[1], 10),
                type: layoutMatch[2],
                name: layoutMatch[3],
            });
            continue;
        }

        const plainMatch = trimmed.match(plainInRegex);
        if (plainMatch) {
            inputs.push({
                location: 0,
                type: plainMatch[1],
                name: plainMatch[2],
            });
        }
    }
    return inputs;
}

function parseOutputsFromVertGLSL(source) {
    // Matches: out [qualifiers] type name;
    // Skips layout(...) or comments
    const lines = source.split(/\r?\n/);
    const outputs = [];
    const outRegex = /^\s*out\s+(?:(?:flat|smooth|noperspective|centroid|lowp|mediump|highp)\s+)*(\w+)\s+(\w+)\s*;/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;
        const match = trimmed.match(outRegex);
        if (match) {
            outputs.push({
                type: match[1],
                name: match[2],
            });
        }
    }
    return outputs;
}

function parseInputsFromFragGLSL(source) {
    // Matches: in [qualifiers] type name;
    // Skips layout(...) or comments
    const lines = source.split(/\r?\n/);
    const inputs = [];
    const inRegex = /^\s*in\s+(?:(?:flat|smooth|noperspective|centroid|lowp|mediump|highp)\s+)*(\w+)\s+(\w+)\s*;/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;
        const match = trimmed.match(inRegex);
        if (match) {
            inputs.push({
                type: match[1],
                name: match[2],
            });
        }
    }
    return inputs;
}

function parseOutputsFromFragGLSL(source) {
    // Matches: layout(location = N) out [qualifiers] type name;
    // or: out [qualifiers] type name;
    const lines = source.split(/\r?\n/);
    const outputs = [];
    const layoutRegex = /^\s*layout\s*\(\s*location\s*=\s*(\d+)\s*\)\s*out\s+(?:(?:flat|smooth|noperspective|centroid|lowp|mediump|highp)\s+)*(\w+)\s+(\w+)\s*;/;
    const plainOutRegex = /^\s*out\s+(?:(?:flat|smooth|noperspective|centroid|lowp|mediump|highp)\s+)*(\w+)\s+(\w+)\s*;/;

    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("/*")) continue;

        const layoutMatch = trimmed.match(layoutRegex);
        if (layoutMatch) {
            outputs.push({
                location: parseInt(layoutMatch[1], 10),
                type: layoutMatch[2],
                name: layoutMatch[3],
            });
            continue;
        }

        const plainMatch = trimmed.match(plainOutRegex);
        if (plainMatch) {
            outputs.push({
                location: 0,
                type: plainMatch[1],
                name: plainMatch[2],
            });
        }
    }
    return outputs;
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

function writeDtsIfChanged(dtsPath, newContent) {
    if (!fs.existsSync(dtsPath) || fs.readFileSync(dtsPath, "utf-8") !== newContent) {
        fs.writeFileSync(dtsPath, newContent, "utf-8");
        console.log(`[generate:shaders] Updated ${path.relative(process.cwd(), dtsPath)}`);
    }
}

function processVertexShader(filePath, allValidationErrors) {
    const baseName = path.basename(filePath, ".vert");
    const pascalBase = toPascalCase(baseName);
    const source = fs.readFileSync(filePath, "utf-8");

    const errors = validateShaderSamplers(filePath, source);
    allValidationErrors.push(...errors);

    const inputs = parseInputsFromVertGLSL(source);
    const uniforms = parseUniformsFromGLSL(source);
    const outputs = parseOutputsFromVertGLSL(source);

    const vertInputsInterfaceName = `${pascalBase}VertInputs`;
    const vertUniformInterfaceName = `${pascalBase}VertUniforms`;
    const vertOutputsInterfaceName = `${pascalBase}VertOutputs`;

    const lines = [
        "/* Auto-generated transparent shader ambient type declarations */",
        "declare const shaderSource: string;",
        "export default shaderSource;",
        "",
        `export interface ${vertInputsInterfaceName} {`,
    ];

    for (const i of inputs) {
        lines.push(`    ${i.name}: { location: ${i.location}; type: "${i.type}" };`);
    }
    lines.push("}");
    lines.push("");

    lines.push(`export interface ${vertUniformInterfaceName} {`);
    for (const u of uniforms) {
        lines.push(`    ${u.name}: ${mapGLSLTypeToTS(u.type)};`);
    }
    lines.push("}");
    lines.push("");

    lines.push(`export interface ${vertOutputsInterfaceName} {`);
    for (const o of outputs) {
        lines.push(`    ${o.name}: "${o.type}";`);
    }
    lines.push("}");
    lines.push("");

    writeDtsIfChanged(`${filePath}.d.ts`, lines.join("\n"));
}

function processFragmentShader(filePath, allValidationErrors) {
    const baseName = path.basename(filePath, ".frag");
    const pascalBase = toPascalCase(baseName);
    const source = fs.readFileSync(filePath, "utf-8");

    const errors = validateShaderSamplers(filePath, source);
    allValidationErrors.push(...errors);

    const inputs = parseInputsFromFragGLSL(source);
    const uniforms = parseUniformsFromGLSL(source);
    const outputs = parseOutputsFromFragGLSL(source);

    const fragInputsInterfaceName = `${pascalBase}FragInputs`;
    const fragUniformInterfaceName = `${pascalBase}FragUniforms`;
    const fragOutputsInterfaceName = `${pascalBase}FragOutputs`;

    const lines = [
        "/* Auto-generated transparent shader ambient type declarations */",
        "declare const shaderSource: string;",
        "export default shaderSource;",
        "",
        `export interface ${fragInputsInterfaceName} {`,
    ];

    for (const i of inputs) {
        lines.push(`    ${i.name}: "${i.type}";`);
    }
    lines.push("}");
    lines.push("");

    lines.push(`export interface ${fragUniformInterfaceName} {`);
    for (const u of uniforms) {
        lines.push(`    ${u.name}: ${mapGLSLTypeToTS(u.type)};`);
    }
    lines.push("}");
    lines.push("");

    lines.push(`export interface ${fragOutputsInterfaceName} {`);
    for (const o of outputs) {
        lines.push(`    ${o.name}: { location: ${o.location}; type: "${o.type}" };`);
    }
    lines.push("}");
    lines.push("");

    writeDtsIfChanged(`${filePath}.d.ts`, lines.join("\n"));
}

function main() {
    const srcDir = path.join(__dirname, "..", "src");
    if (!fs.existsSync(srcDir)) return;

    const shaderFiles = findShaderFiles(srcDir);
    console.log(`[generate:shaders] Found ${shaderFiles.length} shader files.`);

    const allValidationErrors = [];

    for (const file of shaderFiles) {
        if (file.endsWith(".vert")) {
            processVertexShader(file, allValidationErrors);
        } else if (file.endsWith(".frag")) {
            processFragmentShader(file, allValidationErrors);
        }
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
