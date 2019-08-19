# Dynamic Endpoint Routing Platform CLI For NodeJS
`derp` is a platform that enables quick and easy management and provisioning of serverless applications.

`derp-cli` for NodeJS allows you to quickly create, deploy, and manage serverless applications to cloud providers such as AWS. You can easily create an AWS Lambda function, create an AWS S3 static hosted website for a front-end, and centrally manage these resources.

[View Roadmap Notes](Roadmap.md)

[View Release Notes](Releases.md)

### Pre-requisites
- Your environment will need access to your AWS account in order to deploy
- NodeJS (8.5+)

### Installation
- npm i -g derp-cli

### Usage
Calling `derp-cli init <appName>` in your terminal will initialize your local `derp` environment. This environment will come with a `derp.json` configuration file and will create your application's routes directory.
```
# derp-cli init <appName>
$ derp-cli init myDerpApp
```
Once your environment has been created, you can make a new route using the CLI. A route is a serverless application that runs your code and can be triggered by various services, such as an API Gateway. Call the `new-route` command and supply the unique route name, definition of the route, and the type of route (e.g. GET, POST). The route definition provides your API with a URL structure (e.g. http://example.com/admin/users/1 would be `admin/users/:id` and would define a route for getting users by their ID). The unique route name will provide an identifier for this route and will be used to create your route's local code folder.
```
# derp-cli new-route <routeName> <routeDefinition> <type>
$ derp-cli new-route getDerpCount derpcount GET
```
This will create a new folder in your local environment called `routes/getDerpCount` with a route stub ready for editing and deployment.
```
# Within routes/getDerpCount directory
$ index.js package.json
```
At this point you can modify the code within this route's index.js to your liking. If you want to add node modules, you can `cd` into the directory and `npm install`.
You can deploy this route to your remote `derp` application using the `derp` CLI. This will setup various services such as API Gateway, Lambda, IAM Roles/Policies, etc.
```
# derp-cli deploy-route <routeName>
$ derp-cli deploy-route getDerpCount
$ getDerpCount route has been deployed to your application at http://example.com/derpcount
```
You can update your remote route at anytime by using the same `derp-cli deploy-route <routeName>` command.

### Inspect
To get information about your current derp application's routes, you can use the following commands:
```
$ derp-cli inspect-routes
╔══════════════╤════════════╤═══════════════════════╤══════╤══════════╗
║ NAME         │ API PATH   │ FILE PATH             │ TYPE │ DEPLOYED ║
╟──────────────┼────────────┼───────────────────────┼──────┼──────────╢
║ getDerpCount │ derpcount  │ ./routes/getDerpCount │ GET  │ true     ║
╚══════════════╧════════════╧═══════════════════════╧══════╧══════════╝
```
```
$ derp-cli inspect-route getDerpCount --property url
http://example.com/derpcount
```
Using `derp`'s inspect commands will help you manage your application, allowing you to track deployment information, versioning, and more.

### Build derp-cli-nodejs Locally
To build derp-cli from source and run locally, run the following commands:
```
# clone the repo
$ git clone https://github.com/derp-io/derp-cli-nodejs.git

# cd into the cloned directory
$ cd derp-cli-nodejs

# install npm modules
$ npm install

# run derp-cli using node
$ node .\bin\derp-cli --version
```