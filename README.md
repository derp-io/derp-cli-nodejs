# Dynamic Endpoint Routing Platform CLI For NodeJS
## DERP
`derp` is a platform for quickly provisioning serverless endpoints as a service for use within a centralized application. The `derp` platform handles everything from website registry, serverless function code management, and endpoint routing integration.
`derp` can be used via the `derp` CLI or the `derp` console on the web.

### Pre-requisites
- If using AWS: Your server will need access to your AWS environment!
- NodeJS

### Installation
- npm i -g derp-cli

### Usage
Use the `derp` CLI to automate your local `derp` environment, including pipelines and environments for testing, release, and more.
Calling `derp-cli start` in your terminal will read your `.derp` configuration file and deploy your envronment.
If the `.derp` configuration file is not detected, a wizard will guide your through defining the file prior to deployment. This step will use `derp` CLI to push the `.derp` configuration file to your `derp` environment.
This initial call to `derp-cli start` will also generate your application's root endpoint (aka "/") with an `index.js` file located within your `derp` application's top folder.
```
$ derp-cli start
```
Once your environment has been deployed, you can create a new endpoint using the CLI:
```
$ derp-cli new getUsers --http:get
```
This will create a new folder in your local environment called `getUsers` with a NodeJS stub for your endpoint as well as a `.derp` file for the endpoint.
```
$ cd getUsers && ls
$ .derp node_modules index.js package.json
```
That command also created a new endpoint within your remote `derp` application that you can view within the `derp` console. You can perform configuration on the endpoints in the `derp` console or the `derp` CLI.
Upon modifying the `index.js` file for the `getUsers` endpoint, you can test it locally and/or deploy it to your `derp` application using the CLI:
```
$ derp-cli debug
$ Application available at http://localhost:8080 including 2 endpoints.
$ derp-cli deploy getUsers
$ getUsers endpoint has been deployed to your application at http://example.com/getUsers
```
Alternatively, you can use the `derp` console on the web to make code changes to your endpoint and deploy them.
