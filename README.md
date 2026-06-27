# twinSoul

This is just a twin soul campaign tool

# Frontend Commands:
npm start
    Starts the development server.

npm run build
    Bundles the app into static files for production.

npm test
    Starts the test runner.

npm run eject
    Removes this tool and copies build dependencies, configuration files
    and scripts into the app directory. If you do this, you can’t go back!

# Backend Commands:

## Create Models:
- rails g [ModelName]
- then add the needed cols in the migration file
- then db:migrate
- then add any required has_many or belongs_to in the associated models
- then Move on to create a controller

## Create COntrollers:
- rails g controller api/v1/[model_name_controller]
- then add it to the routes.rb file
- then add the associated backendhelpers in the backendHelpers.ts file 