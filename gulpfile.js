const { src, dest, task, watch, series, parallel } = require('gulp');

const options = require('./config');

const del = require('del');
const browserSync = require('browser-sync').create();
const tailwindcss = require('tailwindcss');
const sass = require('gulp-sass');
const postcss = require('gulp-postcss');
const htmlnano = require('gulp-htmlnano');
const concat = require('gulp-concat');
const uglify = require('gulp-terser');
const imagemin = require('gulp-imagemin');
const cleanCSS = require('gulp-clean-css');
const purgecss = require('gulp-purgecss');
const logSymbols = require('log-symbols');

function livePreview(done) {
  browserSync.init({
    server: {
      baseDir: options.paths.dist.base,
    },
    open: false,
    port: options.config.port || 5000,
  });
  done();
}

function previewReload(done) {
  console.log('\n\t' + logSymbols.info, 'Reloading Browser Preview.\n');
  browserSync.reload();
  done();
}

/* 

  DEVELOPMENT tasks

*/

function devHTML() {
  return src(`${options.paths.src.base}/**/*.html`).pipe(
    dest(options.paths.dist.base)
  );
}

function demoHTML() {
  return src(`${options.paths.src.base}/**/*.html`)
    .pipe(htmlnano({ removeComments: true, collapseWhitespace: 'agressive' }))
    .pipe(dest(options.paths.build.base));
}

function devStyles() {
  return src(`${options.paths.src.css}/**/*`)
    .pipe(sass().on('error', sass.logError))
    .pipe(
      postcss([tailwindcss(options.config.tailwindjs), require('autoprefixer')])
    )
    .pipe(concat({ path: 'style.css' }))
    .pipe(dest(options.paths.dist.css));
}

function devScripts() {
  return src([
    `${options.paths.src.js}/libs/**/*.js`,
    `${options.paths.src.js}/**/*.js`,
    `!${options.paths.src.js}/**/external/*`,
  ])
    .pipe(concat({ path: 'scripts.js' }))
    .pipe(dest(options.paths.dist.js));
}

function devImages() {
  return src(`${options.paths.src.img}/**/*`).pipe(
    dest(options.paths.dist.img)
  );
}

function watchFiles() {
  watch(`${options.paths.src.base}/**/*.html`, series(devHTML, previewReload));
  watch(
    [options.config.tailwindjs, `${options.paths.src.css}/**/*`],
    series(devStyles, previewReload)
  );
  watch(`${options.paths.src.js}/**/*.js`, series(devScripts, previewReload));
  watch(`${options.paths.src.img}/**/*`, series(devImages, previewReload));
  console.log('\n\t' + logSymbols.info, 'Watching for Changes..\n');
}

function devClean() {
  console.log(
    '\n\t' + logSymbols.info,
    'Cleaning dist folder for fresh start.\n'
  );
  return del([options.paths.dist.base]);
}

/* 

  PRODUCTION tasks

*/

function prodHTML() {
  return src(`${options.paths.src.base}/**/*.html`)
    .pipe(htmlnano({ removeComments: true, collapseWhitespace: 'agressive' }))
    .pipe(dest(options.paths.build.base));
}

function prodStyles() {
  return src(`${options.paths.src.css}/**/*`)
    .pipe(sass().on('error', sass.logError))
    .pipe(
      postcss([tailwindcss(options.config.tailwindjs), require('autoprefixer')])
    )
    .pipe(concat({ path: 'style.css' }))
    .pipe(
      purgecss({
        content: ['src/**/*.{html,js}'],
        defaultExtractor: (content) => {
          const broadMatches = content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [];
          const innerMatches =
            content.match(/[^<>"'`\s.()]*[^<>"'`\s.():]/g) || [];
          return broadMatches.concat(innerMatches);
        },
      })
    )
    .pipe(cleanCSS({ compatibility: 'ie8' }))
    .pipe(dest(options.paths.build.css));
}

function prodScripts() {
  return src([
    `${options.paths.src.js}/libs/**/*.js`,
    `${options.paths.src.js}/**/*.js`,
  ])
    .pipe(concat({ path: 'scripts.js' }))
    .pipe(uglify())
    .pipe(dest(options.paths.build.js));
}

function prodImages() {
  return src(options.paths.src.img + '/**/*')
    .pipe(imagemin())
    .pipe(dest(options.paths.build.img));
}

function prodClean() {
  console.log(
    '\n\t' + logSymbols.info,
    'Cleaning build folder for fresh start.\n'
  );
  return del([options.paths.build.base]);
}

function buildFinish(done) {
  console.log(
    '\n\t' + logSymbols.success,
    `Production build is complete. Files are located at ${options.paths.build.base}\n`
  );
  done();
}

exports.default = series(
  devClean,
  parallel(devStyles, devScripts, devImages, devHTML),
  livePreview,
  watchFiles
);

exports.demo = series(
  prodClean,
  parallel(prodStyles, prodScripts, prodImages, demoHTML),
  buildFinish
);

exports.prod = series(
  prodClean,
  parallel(prodStyles, prodScripts, prodImages, prodHTML),
  buildFinish
);
