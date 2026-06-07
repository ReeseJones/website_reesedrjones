# Personal Website
I created this website to showcase some public project and skills, share ideas and things I've learned!

Visit the deployed site at [https://reesedrjones.com/](https://reesedrjones.com/)

## Setup

Clone or fork this repository and use npm to setup the project

```bash
git clone https://github.com/ReeseJones/website_reesedrjones.git
cd website_reesedrjones
npm install
```

## Running

Run this project locally with npm

```bash
npm run start
```

This starts [Parcel](https://parceljs.org/) which bundles and locally hosts the website.

I chose Parcel because it
 - Integrates JavaScript and HTML seamlessly
 - Deals with asset management such as loading images between code and webpages
 - Automatically handles bundling css and compiling scss
 - Is easy to use developing locally for my static website

## Publishing

Parcel is also responsible for building it for the production environment.

```bash
npm run build
```

This will kick Parcel off in build mode. This outputs files to a local ./dist folder.

## Hosting

Currently this project is hosted on [Cloudflare](https://www.cloudflare.com/) and connected via [Github](https://github.com). The project is automatically deployed when the main branch is updated.