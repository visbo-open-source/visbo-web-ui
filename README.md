# Visbo Client

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.7.2.
To use angular-cli you have to install it globally `npm install -g @angular/cli`

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

the final destination for production is that the client is part of the visbo-rest-server environment. As long as it is not configured, do the following:
Compile with the following options: `ng build --prod --env=prod --base-href /ui/` This defines the base path for the loader to use /ui/
Copy the result files from dest to the folder /public/ui/ on the rest server. restart the Rest Server.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
