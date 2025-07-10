# How to Use Railway MCP Tools

This guide provides instructions on how to use the Railway MCP (Model Context Protocol) tools to interact with your Railway projects programmatically.

## Prerequisites

1. A Railway account
2. A Railway API token
3. Access to Cascade AI with the Railway MCP server

## Step 1: Configure the Railway API Token

Before using any Railway MCP tools, you need to configure your Railway API token:

```
mcp4_configure_api_token
```

Parameter:
- `token`: Your Railway API token (can be created at https://railway.app/account/tokens)

Example:
```
mcp4_configure_api_token(token="your-railway-api-token")
```

## Step 2: List Your Railway Projects

Once your API token is configured, you can list your Railway projects:

```
mcp4_service_list
```

Parameter:
- `projectId`: ID of the project to list services from

Example:
```
mcp4_service_list(projectId="your-project-id")
```

## Step 3: Access Project Information

To get detailed information about a specific project:

```
mcp4_project_info
```

Parameter:
- `projectId`: ID of the project to get information about

Example:
```
mcp4_project_info(projectId="your-project-id")
```

## Step 4: List Services in a Project

To list all services in a specific project:

```
mcp4_service_list
```

Parameter:
- `projectId`: ID of the project to list services from

Example:
```
mcp4_service_list(projectId="your-project-id")
```

## Step 5: Get Service Information

To get detailed information about a specific service:

```
mcp4_service_info
```

Parameters:
- `projectId`: ID of the project containing the service
- `serviceId`: ID of the service to get information about
- `environmentId`: ID of the environment to check

Example:
```
mcp4_service_info(
  projectId="your-project-id",
  serviceId="your-service-id",
  environmentId="your-environment-id"
)
```

## Step 6: List Service Variables

To list all environment variables for a service:

```
mcp4_list_service_variables
```

Parameters:
- `projectId`: ID of the project containing the service
- `environmentId`: ID of the environment to list variables from
- `serviceId`: (Optional) ID of the service to list variables for

Example:
```
mcp4_list_service_variables(
  projectId="your-project-id",
  environmentId="your-environment-id",
  serviceId="your-service-id"
)
```

## Step 7: Set Service Variables

To set environment variables for a service:

```
mcp4_variable_set
```

Parameters:
- `projectId`: ID of the project containing the service
- `environmentId`: ID of the environment for the variable
- `serviceId`: (Optional) ID of the service for the variable
- `name`: Name of the environment variable
- `value`: Value to set for the variable

Example:
```
mcp4_variable_set(
  projectId="your-project-id",
  environmentId="your-environment-id",
  serviceId="your-service-id",
  name="VARIABLE_NAME",
  value="variable-value"
)
```

## Step 8: Bulk Set Service Variables

To set multiple environment variables at once:

```
mcp4_variable_bulk_set
```

Parameters:
- `projectId`: ID of the project containing the service
- `environmentId`: ID of the environment for the variables
- `serviceId`: (Optional) ID of the service for the variables
- `variables`: Object mapping variable names to values

Example:
```
mcp4_variable_bulk_set(
  projectId="your-project-id",
  environmentId="your-environment-id",
  serviceId="your-service-id",
  variables={
    "VARIABLE_1": "value-1",
    "VARIABLE_2": "value-2"
  }
)
```

## Step 9: Deploy a Service

To trigger a new deployment for a service:

```
mcp4_deployment_trigger
```

Parameters:
- `projectId`: ID of the project
- `serviceId`: ID of the service
- `environmentId`: ID of the environment
- `commitSha`: (Optional) Specific commit SHA from the Git repository

Example:
```
mcp4_deployment_trigger(
  projectId="your-project-id",
  serviceId="your-service-id",
  environmentId="your-environment-id"
)
```

## Step 10: Check Deployment Status

To check the status of a deployment:

```
mcp4_deployment_status
```

Parameter:
- `deploymentId`: ID of the deployment to check status for

Example:
```
mcp4_deployment_status(deploymentId="your-deployment-id")
```

## Step 11: View Deployment Logs

To view the logs of a deployment:

```
mcp4_deployment_logs
```

Parameters:
- `deploymentId`: ID of the deployment to get logs for
- `limit`: (Optional) Maximum number of log entries to fetch

Example:
```
mcp4_deployment_logs(
  deploymentId="your-deployment-id",
  limit=100
)
```

## Troubleshooting

### API Token Issues

If you encounter errors related to the API token, ensure that:
1. You have created a valid token at https://railway.app/account/tokens
2. You have configured the token using `mcp4_configure_api_token`
3. The token has not expired

### Invalid Arguments Errors

If you see "Invalid arguments" errors, ensure that:
1. You are providing all required parameters for the function
2. The parameter values are correct and valid
3. You are using the correct function for your task

### Project or Service Not Found

If you get "not found" errors, ensure that:
1. The project ID, service ID, and environment ID are correct
2. You have permission to access the specified resources
3. The resources still exist in your Railway account

## Common Railway MCP Functions Reference

| Function | Description |
|----------|-------------|
| `mcp4_configure_api_token` | Configure the Railway API token |
| `mcp4_project_list` | List all projects in your Railway account |
| `mcp4_project_info` | Get detailed information about a specific project |
| `mcp4_service_list` | List all services in a specific project |
| `mcp4_service_info` | Get detailed information about a specific service |
| `mcp4_list_service_variables` | List all environment variables for a service |
| `mcp4_variable_set` | Set an environment variable for a service |
| `mcp4_variable_bulk_set` | Set multiple environment variables at once |
| `mcp4_deployment_trigger` | Trigger a new deployment for a service |
| `mcp4_deployment_status` | Check the status of a deployment |
| `mcp4_deployment_logs` | View the logs of a deployment |

## Example Workflow

Here's a complete example workflow for deploying a service and checking its status:

```python
# Step 1: Configure API token
mcp4_configure_api_token(token="your-railway-api-token")

# Step 2: List services in a project
services = mcp4_service_list(projectId="your-project-id")

# Step 3: Set environment variables for a service
mcp4_variable_bulk_set(
  projectId="your-project-id",
  environmentId="your-environment-id",
  serviceId="your-service-id",
  variables={
    "NODE_ENV": "production",
    "PORT": "3000"
  }
)

# Step 4: Trigger a deployment
deployment = mcp4_deployment_trigger(
  projectId="your-project-id",
  serviceId="your-service-id",
  environmentId="your-environment-id"
)

# Step 5: Check deployment status
status = mcp4_deployment_status(deploymentId=deployment.id)

# Step 6: View deployment logs
logs = mcp4_deployment_logs(deploymentId=deployment.id, limit=100)
```

Remember to replace placeholder values like "your-project-id" with your actual Railway project ID.
