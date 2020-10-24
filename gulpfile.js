/* eslint prefer-destructuring: off */

const autoprefixer = require('gulp-autoprefixer');
const colors = require('colors/safe');
const consola = require('consola');
const del = require('del');
const path = require('path');

const {
  dest,
  parallel,
  series,
  src,
  watch,
} = require('gulp');
const gTypescript = require('gulp-typescript');
const gSass = require('gulp-sass');
const gSourcemaps = require('gulp-sourcemaps');
const gZip = require('gulp-zip');

// Config & Helpers

const paths = {
  build: path.resolve('./build'),
  dist: path.resolve('./dist'),
  sass: ['./src/content/css/*.scss'],
  ts: ['./src/**/*.ts'],
};

const staticExtensions = [
  'html', 'js', 'json', 'css', 'png', 'jpg',
  'svg', 'ttf', 'eot', 'otf', 'woff', 'woff2',
];

const vendorFiles = [];

/* TASKS */

/**
 * gulp paths
 * Print the currently used paths (as resolved) and exit.
 */
function showPaths(done) {
  consola.log(colors.magenta('Currently using paths:'));
  Object.keys(paths).forEach((k) => {
    consola.log(colors.white(k), '->', colors.green(paths[k]));
  });
  done();
}

/**
 * gulp clean
 * Deletes all files in the build and dist directories.
 */
function clean() {
  return del([
    `${paths.build}/*`,
    `${paths.dist}/*.zip`,
  ]);
}

/**
 * gulp copyStatic
 * Copies all static files that do not require pre-processing / compilation.
 */
function copyStatic() {
  const resolvedFiles = staticExtensions.map(ext => path.resolve(`./src/**/*.${ext}`));
  return src(resolvedFiles).pipe(dest(paths.build));
}

/**
 * gulp copyVendor
 * Copies vendor files to build.
 */
function copyVendor() {
  return src(vendorFiles.map(f => `./node_modules/${f}`)).pipe(dest(`${paths.build}/vendor`));
}

/**
 * gulp typescript
 * Compiles all TypesScript code to the build directory.
 */
function typescript() {
  const tsProject = gTypescript.createProject(path.resolve('./tsconfig.json'));
  return tsProject.src()
    .pipe(tsProject())
    .js
    .pipe(dest(paths.build));
}

/**
 * gulp sass
 * Builds all project SCSS files and copies them to src.
 * - In development, output is expanded and sourcemaps are produced.
 * - In production, output is compressed with no sourcemaps.
 */
function sass() {
  return src(paths.sass)
    .pipe(gSourcemaps.init())
    .pipe(
      gSass({
        errLogToConsole: true,
        outputStyle: 'compressed',
        includePaths: [paths.sass],
      }).on('error', gSass.logError),
    )
    .pipe(autoprefixer())
    .pipe(gSourcemaps.write())
    .pipe(dest(`${paths.build}/content/css`));
}

/**
 * Zips up the build directory into the dist directory (webextensions are just zips).
 */
function zip() {
  return src(`${paths.build}/**/*`)
    .pipe(gZip('nzbunity.zip'))
    .pipe(dest(paths.dist));
}

// Export tasks

exports.paths = showPaths;
exports.clean = clean;
exports.copyStatic = copyStatic;
exports.copyVendor = copyVendor;
exports.typescript = typescript;
exports.sass = sass;

/**
 * gulp copy
 * Copies static and vendor files to build.
 */
exports.copy = parallel(copyStatic, copyVendor);

/**
 * gulp build
 * Runs all necessary tasks to build the project.
 */
exports.build = series(exports.copy, typescript, sass);

/**
 * gulp dist
 * Cleans output directories, builds the project, and packages it for distribution.
 */
exports.dist = series(clean, exports.build, zip);

// Watchers

exports.watchCopy = function watchCopy() { watch(staticExtensions.map(ext => `./src/**/*.${ext}`), exports.copy); };
exports.watchSass = function watchSass() { watch(paths.sass, sass); };
exports.watchTs = function watchTs() { watch(paths.ts, typescript); };

exports.watchAll = function watchAll(done) {
  exports.watchCopy();
  exports.watchSass();
  exports.watchTs();
  done();
};

exports.watch = series(exports.build, exports.watchAll);

exports.default = exports.build;
