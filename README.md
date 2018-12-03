# Visbo Client

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 1.7.2.
To use angular-cli you have to install it globally `npm install -g @angular/cli`

<h2>Installing on local machine</h2>
<h4>Please make sure you have node.js installed on your machine</h4>
If you don't have, <a href="https://nodejs.org/" >click here...</a>
<br><br>
<b>1. check if you have it installed or not</b>,

	npm -v

and,

	node -v

you should see some version info in return.<br><br>


<b>2. now go to the directory where you want to place the project files using git bash (terminal for mac)</b><br>
run the command

	git clone URL

here URL is the http url you get from the repository page.<br><br>

<b>3. now navigate to the project directory with cmd (terminal for mac)</b><br>
run the command

	npm install

wait for it to be completed. It usually takes a minute or less to complete.<br>
It will download all the dependencies.<br><br>


## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `-prod` flag for a production build.

the final destination for production is a location inside nginx. Either compile and copy the files from dist to the nginx folder or specify the nginx folder during build:
`ng build --prod --output-path=nginx_folder`

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
