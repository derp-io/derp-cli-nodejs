# derp Milestones and Release Information

Current Release: v0.2.0

## v0.1.0 :heavy_check_mark:
### Milestones
- Provide CLI commands to create a new derp app :heavy_check_mark:
- Provide CLI commands to create a basic derp route (e.g. `/getUsers`) :heavy_check_mark:
- Provide CLI commands to deploy a basic derp route to AWS :heavy_check_mark:

## v0.2.0 :heavy_check_mark:
### Milestones
- Provide CLI commands to describe derp apps within environment (backlogged)
- Provide CLI commands to describe derp routes within derp app :heavy_check_mark:
- Provide CLI commands to update a deployed derp route's code :heavy_check_mark:
- Provide CLI command to locally test routes :heavy_check_mark:

## v0.3.0
### Milestones
- Provide CLI commands to create complex derp route, including hierarchical paths and parameter path parts (e.g. `/admin/users` and `/admin/users/:id`)
- Provide CLI commands to deploy complex derp route

## v0.4.0
### Milestones
- Provide CLI commands to create a front-end serverless app (e.g. `derp-cli new-website mySite`)
- Provide CLI commands to deploy a front-end serverless app (e.g. `derp-cli deploy-website mySite`)
- Provide CLI commands to integrate deployed routes with front-end serverless app

## v0.5.0
### Milestones
- Provide command to create deployment stages for routes (e.g. `derp-cli new-stage qa`)
- Provide optional version and stage properties for route deployments (e.g. `derp-cli deploy-route getUser --versionId 2 --stageId qa`)

## v0.6.0
### Milestones
- Provide command to copy a deployed route to a different stage with optional version property (e.g. `derp-cli copy-route getUser prod --versionId 2`)

## v0.7.0
### Milestones
- Provide inspection to display deployed route versions
- Provide inspection to display deployed route version on each stage
- Provide inspection to display available stages
- Provide inspection to display specific stage information

## v0.8.0
### Milestones:
- Provide CLI commands to undeploy a deployed derp route
- Provide CLI command options to associate custom policies for roles associated with derp routes

## v0.9.0
### Milestones
- Provide CLI command options to integrate CloudFront with front-end serverless apps
- Provide CLI command options to integrate Route53 with front-end serverless apps

## v0.10.0
### Milestones
- Provide CLI command to locally host front-end serverless app

## v0.11.0
### Milestones
- Provide CLI command to distribute routes globally
- Provide CLI command to distribute manage regional deployment of routes