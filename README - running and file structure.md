## INSTALL:
-------------------------------------------------------------------------------------------------------------------------

- Install dependencies in the project folder:

bun install

- Install TypeScript globally:

npm install -g typescript

## RUNNING:
-------------------------------------------------------------------------------------------------------------------------

- Start (Development mode with watch and dev server):

bun run dev

- Production build, creates folder structure (Minification of JS, CSS, HTML):

bun run build

## INITIALIZING IN NEW PROJECT:
-------------------------------------------------------------------------------------------------------------------------

1. From the current project, move only configuration files and source folders. In short:

my-app/
├─ src/                # Entire source folder (JS/TS, SCSS, HTML, assets)
├─ bun.build.ts        # Build script / dev server
├─ tsconfig.json       # TypeScript configuration
├─ package.json        # If you have dev/production dependencies
├─ README.md           # Optional

(Do NOT move dist/ or node_modules/ or lock files (bun.lockb) – in the new project everything will be installed fresh)

2. Copy the files to the new folder

3. Install Bun.js (if you don’t have it)

According to instructions at: https://bun.sh/

4. Install all packages:

bun install

5. Run:

bun run dev

or

bun run build

## FILE STRUCTURE:
-------------------------------------------------------------------------------------------------------------------------

my-app/
├─ src/                  # Project sources
│   ├─ js/               # JS / TS files
│   │    └─ script.js    # App entry point
│   ├─ scss/             # SASS files
│   │    └─ style.scss   # Main SCSS file
│   ├─ html/             # HTML files
│   │    ├─ index.html   # Main page
│   │    └─ partials/    # Includes like header/footer
│   │         ├─ header.html
│   │         └─ footer.html
│   └─ assets/           # Images, fonts, icons, other static resources
├─ dist/                 # Build output (auto-generated)
│   ├─ js/               # Minified JS / TS as *.min.js
│   ├─ css/              # Minified SASS as *.min.css
│   ├─ assets/           # Optimized images
│   └─ index.html        # HTML files without comments
├─ bun.build.ts          # Bun build/watch script
├─ package.json
├─ tsconfig.json
└─ README.md
