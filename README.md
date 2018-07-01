# Dynamic Endpoint Routing Platform CLI For NodeJS
## About DERP
`derp` is a platform that enables quick and easy management and provisioning of serverless applications.

### Pre-requisites
- Your environment will need access to your AWS account in order to deploy
- NodeJS (8.5+)

### Installation
- npm i -g derp-cli

### Usage
Calling `derp-cli init <appName>` in your terminal initialize your local `derp` environment. This environment will come with a `derp.json` configuration file and will create your application's routes directory.
```
# derp-cli init <appName>
$ derp-cli init myDerpApp
```
Once your environment has been created, you can make a new route using the CLI, supplying the unique route name, definition of the route, and the type of route (e.g. GET, POST). The route definition provides your API with a URL structure (e.g. http://example.com/admin/users/1 would be `admin/users/:id` and would define a route for getting users by their ID).
```
# derp-cli new-route <routeName> <routeDefinition> <type>
$ derp-cli new-route getDerpCount derpcount GET
```
This will create a new folder in your local environment called `getDerpCount` with a route stub ready for editing and deployment.
```
# Within routes/getDerpCount directory
$ index.js package.json
```
At this point you can modify the code within this route to your liking.
You can deploy it to your remote `derp` application using the `derp` CLI:
```
# derp-cli deploy-route <routeName>
$ derp-cli deploy-route getDerpCount
$ getDerpCount route has been deployed to your application at http://example.com/getDerpCount
```