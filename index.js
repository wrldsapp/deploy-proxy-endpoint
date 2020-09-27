const AWS = require('aws-sdk');
const core = require('@actions/core');
const parentId = core.getInput('parentId');
const apiId = core.getInput('apiId');
var apigateway = new AWS.APIGateway();

// 1. Add a resource
// 2. Add method with proxy integration
// 3. Pass back the path for the endpoint.


async function createEndpoints(created) {
    console.log("Created", created);
    return await Promise.all(created.map(async (x) => {
        let resource = await addResource(x.name);
        console.log("Resource", resource);
        await addMethod(resource.id).then(async () => {
            await addIntegration(resource.id, x.arn);
            resolve(resource);
        });
    }));
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
    const functions = JSON.parse(core.getInput('functions'));
    Promise.allSettled([
        createEndpoints(functions.created),
        deleteEndpoints(functions.deleted),
    ]).then(output => {
        logOutput(output);
    });
} catch (err) {
    core.setFailed('Err');
}