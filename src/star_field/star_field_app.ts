import { Application, PointData, Particle as PixiParticle, Assets, ParticleContainer, Point, Texture, WRAP_MODES } from "pixi.js";

import starCloudFilepath from "url:../images/starcloud.png";

import { clamp, makeColor, randomNumber } from "../lib/helpers";
import { Particle } from "./particle";
import { StarFieldParameters } from "./star_field_parameters";
import { LineRenderer } from "./line_renderer";
import { spawnStars } from "./star_spawner";


export class StarField {

    private particleContainer = new ParticleContainer({ dynamicProperties:{
        scale: true,
        position: true,
        rotation: true,
        uvs: true,
        alpha: true,
        tint: true,
        //color: true,
    }});

    private stars: Particle[] = [];
    private lastPosition = new Point(0, 0);
    private starTexture: Texture | null = null;
    private lineRenderer: LineRenderer | null = null;
    private parallaxSpeedMultiplier = 0.7;

    constructor(private app: Application, private options?: StarFieldParameters) {
        
    }

    public async initialize() {
        this.starTexture = await Assets.load(starCloudFilepath);

        if(!this.starTexture) {
            console.error("Failed to load star texture");
            return;
        }

        this.starTexture.source.addressMode = "repeat";

        this.particleContainer.blendMode = "add";
        this.app.stage.addChild(this.particleContainer);
        const width = window.screen.width;
        const height = window.screen.height;
        const spawnBounds = {
            x: -width,
            y: -height,
            width: width * 2,
            height: height * 2
        };
        const defaultOptions = {
            count: 50,
            minScale: 0.1,
            maxScale: 1.3,
            minEdges: 1,
            maxEdges: 2,
            maxDepth: 6,
            ...this.options
        };

        const { rootStars, stars } = spawnStars(
            spawnBounds,
            defaultOptions.count,
            defaultOptions.minScale,
            defaultOptions.maxScale,
            defaultOptions.minEdges,
            defaultOptions.maxEdges,
            defaultOptions.maxDepth
        );

        console.log(
            `rootStars: ${rootStars.length} totalStars: ${stars.length}`
        );

        for (const star of stars) {

            const offset = this.getMouseOffsetPosition(star.scale);

            star.particle = new PixiParticle({
                 texture: this.starTexture,
                    x: star.position.x + offset.x,
                    y:  star.position.y + offset.y,
                    scaleX: star.scale,
                    scaleY: star.scale,
                    anchorX: 0.5,
                    anchorY: 0.5,
                    tint:  makeColor(
                            randomNumber(0.9, 1),
                            randomNumber(0.7, 0.9),
                            randomNumber(0.4, 0.7)
                        ),
            });

            this.stars.push(star);
            this.particleContainer.addParticle(star.particle);
        }

        //this.particleContainer.sortableChildren = true;
        //this.particleContainer.sortChildren();
        this.app.ticker.add(this.update);
        this.lineRenderer = new LineRenderer(this.app, rootStars);

        await this.lineRenderer.initialize();
    }

    public destroy(): void {
        this.app.ticker.remove(this.update);
        this.starTexture?.destroy();
        this.app.stage.removeChild(this.particleContainer);
        this.particleContainer.destroy({
            children: true,
            texture: true,
            textureSource: true
        });
        this.lineRenderer?.destroy();
    }

    private getMouseOffsetPosition = (speedMultiplier: number) => {
        const mousePos: PointData =
            this.app.renderer.events.pointer.global;

        mousePos.x = clamp(mousePos.x, 0, window.innerWidth);
        mousePos.y = clamp(mousePos.y, 0, window.innerHeight);

        if (this.lastPosition.x === 0 && this.lastPosition.y === 0) {
            this.lastPosition = new Point(mousePos.x, mousePos.y);
        }

        const screenWidth = this.app.screen.width;
        const screenHeight = this.app.screen.height;

        const vec = {
            x:
                (mousePos.x - screenWidth / 2) / (screenWidth / 2) +
                Math.sin(this.spinner * Math.PI) * Math.cos(this.spinner * 25),
            y:
                (mousePos.y - screenHeight / 2) / (screenHeight / 2) +
                Math.sin(3 * this.spinner * Math.PI) * Math.cos(this.spinner * 25)
        };
        const finalOffset = {
            x:
                ((-vec.x * screenWidth) / 2) *
                speedMultiplier *
                this.parallaxSpeedMultiplier,
            y:
                ((-vec.y * screenHeight) / 2) *
                speedMultiplier *
                this.parallaxSpeedMultiplier
        };

        return finalOffset;
    };

    private spinner = 0;
    private update = () => {
        const dt = this.app.ticker.elapsedMS / 1000;
        this.spinner += (Math.PI / 512) * dt;
        for (let i = 0; i < this.stars.length; i++) {
            const star = this.stars[i];
            star.direction += star.directionSpeed * dt;
            if (star.particle) {
                star.particle.rotation = star.direction;
                const offset = this.getMouseOffsetPosition(star.scale);
                star.particle.x = star.position.x + offset.x;
                star.particle.y = star.position.y + offset.y;
            }
        }
    };
}
