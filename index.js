const AWS = require('aws-sdk');
const core = require('@actions/core');

const parentId = core.getInput('parentId');
const apiId = core.getInput('apiId');
const env = core.getInput('env');

const newFunctions = require(`${process.env.HOME}/newFunctions.json`);
const deletedFunctions = require(`${process.env.HOME}/deletedFunctions.json`);

var apigateway = new AWS.APIGateway();

// 1. Add a resource
// 2. Add method with proxy integration
// 3. Pass back the path for the endpoint.


async function createEndpoints() {
    return new Promise(function(resolve, reject) {
        const resources = [];
        for (i in newFunctions) {
            addResource(newFunctions[i].name)
            .then(resource => {
                resources.push(resource);
                addMethod(resource.id)
                .then(() => {
                    addIntegration(resource.id, newFunctions[i].arn);
                });
            });
        }
        resolve(resources); // Return the resources to show success message.
    });
}


async function addResource(name) {
    return new Promise(function(resolve, reject) {
        var resourceParams = {
            parentId: parentId,
            pathPart: name,
            restApiId: apiId
        };
        // Create resource
        apigateway.createResource(params, 
            function(err ,data) {
                if (err) {
                    reject(err);
                } else {
                    let resource = { id: data.Id, path: data.path };
                    resolve(resource);   
                }
            }
        );
    });
}


async function addMethod(resourceId) {
    return new Promise(function(resolve, reject) {
        var params = {
            authorizationType: 'NONE', 
            httpMethod: 'POST', 
            resourceId: resourceId, 
            restApiId: apiId, 
        };
    
        apigateway.putMethod(params, 
            function(err, data) {
                if (err) { reject(err); }
                else { resolve; }
            }
        );
    });
}


async function addIntegration(resourceId, lambdaArn) {
    return new Promise(function(resolve, reject) {
        var params = {
            httpMethod: 'POST',
            resourceId: resourceId, 
            restApiId: apiId,
            type: 'AWS_PROXY',
            uri: `arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`
        };
    
        apigateway.putIntegration(params, 
            function(err, data) {
                if (err) {
                    reject(err);
                } else {
                    resolve;
                }
            }
        );
    });
}




async function deleteEndpoints() {
    console.log('Delete');
    // apigateway.getResources();

}


function logOutput(output) {
    let newResources = output[0];
    let deletedResources = output[1];
    for (i in newResources) {
        console.log(`New endpoint created: ${newResources[i].path}`);
    }
    for (i in deletedResources) {
        console.log(`Endpoint deleted at ${deletedResources[i]}`);
    }
}


try {
    Promise.all([
        createEndpoints,
        deleteEndpoints,
    ]).then(output => {
        logOutput(output);
    });
} catch (err) {

}