---
name: mcp-builder
description: Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services in Python using FastMCP.
---

# MCP Server Development Guide

## Overview

To create high-quality MCP (Model Context Protocol) servers that enable LLMs to effectively interact with external services, use this skill. An MCP server provides tools that allow LLMs to access external services and APIs. The quality of an MCP server is measured by how well it enables LLMs to accomplish real-world tasks using the tools provided.

---

# Process

## 🚀 High-Level Workflow

Creating a high-quality MCP server involves four main phases:

### Phase 1: Deep Research and Planning

#### 1.1 Understand Agent-Centric Design Principles

Before diving into implementation, understand how to design tools for AI agents by reviewing these principles:

**Build for Workflows, Not Just API Endpoints:**
- Don't simply wrap existing API endpoints - build thoughtful, high-impact workflow tools
- Consolidate related operations (e.g., `schedule_event` that both checks availability and creates event)
- Focus on tools that enable complete tasks, not just individual API calls
- Consider what workflows agents actually need to accomplish

**Optimize for Limited Context:**
- Agents have constrained context windows - make every token count
- Return high-signal information, not exhaustive data dumps
- Provide "concise" vs "detailed" response format options
- Default to human-readable identifiers over technical codes (names over IDs)
- Consider the agent's context budget as a scarce resource

**Design Actionable Error Messages:**
- Error messages should guide agents toward correct usage patterns
- Suggest specific steps: "Try using filter='active_only' to reduce results"
- Make errors educational, not just diagnostic
- Help agents learn proper tool usage through clear feedback

**Follow Natural Task Subdivisions:**
- Tool names should reflect how humans think about tasks
- Group related tools with consistent prefixes for discoverability
- Design tools around natural workflows, not just API structure

**Use Evaluation-Driven Development:**
- Create realistic evaluation scenarios early
- Let agent feedback drive tool improvements
- Prototype quickly and iterate based on actual agent performance

#### 1.3 Study MCP Protocol Documentation

**Fetch the latest MCP protocol documentation:**

Use WebFetch to load: `https://modelcontextprotocol.io/llms-full.txt`

This comprehensive document contains the complete MCP specification and guidelines.

#### 1.4 Study Framework Documentation

**Load and read the following reference files:**

- **MCP Best Practices**: [📋 View Best Practices](./reference/mcp_best_practices.md) - Core guidelines for all MCP servers
- **Python SDK Documentation**: Use WebFetch to load `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`
- **Autobots Python SDK Documentation**: Read this file `/p/hdk/pu_tu/prd/autobots_sdk/2.2.1/autobots_sdk/base/mcp/servers/README.md`
- [🐍 Python Implementation Guide](./reference/python_mcp_server.md) - Python-specific best practices and examples

#### 1.5 Exhaustively Study API Documentation

To integrate a service, read through **ALL** available API documentation:
- Official API reference documentation
- Authentication and authorization requirements
- Rate limiting and pagination patterns
- Error responses and status codes
- Available endpoints and their parameters
- Data models and schemas

**To gather comprehensive information, use web search and the WebFetch tool as needed.**

#### 1.6 Create a Comprehensive Implementation Plan

Based on your research, create a detailed plan that includes:

**Tool Selection:**
- List the most valuable endpoints/operations to implement
- Prioritize tools that enable the most common and important use cases
- Consider which tools work together to enable complex workflows

**Shared Utilities and Helpers:**
- Identify common API request patterns
- Plan pagination helpers
- Design filtering and formatting utilities
- Plan error handling strategies

**Input/Output Design:**
- Define input validation models using Pydantic
- Design consistent response formats (e.g., JSON or Markdown), and configurable levels of detail (e.g., Detailed or Concise)
- Plan for large-scale usage (thousands of users/resources)
- Implement character limits and truncation strategies (e.g., 25,000 tokens)

**Error Handling Strategy:**
- Plan graceful failure modes
- Design clear, actionable, LLM-friendly, natural language error messages which prompt further action
- Consider rate limiting and timeout scenarios
- Handle authentication and authorization errors

---

### Phase 2: Implementation

Now that you have a comprehensive plan, begin implementation following Python best practices.

#### 2.1 Set Up Project Structure

**For Python:**
- Use the `AutobotsMCPStdioServer` base class from `/p/hdk/pu_tu/prd/autobots_sdk/2.2.1/autobots_sdk/base/mcp/servers/base_server.py`
- Create a single `.py` file or organize into modules if complex (see [🐍 Python Guide](./reference/python_mcp_server.md))
- Define Pydantic models for input validation

**Example Server Structure:**

````python
from autobots_sdk.base.mcp.servers.base_server import AutobotsMCPStdioServer, Context, ToolError
from pydantic import BaseModel, Field

# Initialize server
mcp = AutobotsMCPStdioServer(
    name="my_service",
    instructions="Instructions for using this MCP server"
)

# Define input models
class MyToolInput(BaseModel):
    param1: str = Field(..., description="Description of parameter")
    param2: int = Field(default=10, description="Optional parameter")

# Define tools
@mcp.tool()
def my_tool(input: MyToolInput, ctx: Context) -> str:
    """Tool description for the LLM."""
    # Tool implementation
    return "result"

if __name__ == "__main__":
    mcp.run()
````

#### 2.2 Implement Core Infrastructure First

**To begin implementation, create shared utilities before implementing tools:**
- API request helper functions
- Error handling utilities
- Response formatting functions (JSON and Markdown)
- Pagination helpers
- Authentication/token management

#### 2.3 Implement Tools Systematically

For each tool in the plan:

**Define Input Schema:**
- Use Pydantic for validation
- Include proper constraints (min/max length, regex patterns, min/max values, ranges)
- Provide clear, descriptive field descriptions
- Include diverse examples in field descriptions

**Write Comprehensive Docstrings:**
- One-line summary of what the tool does
- Detailed explanation of purpose and functionality
- Explicit parameter types with examples
- Complete return type schema
- Usage examples (when to use, when not to use)
- Error handling documentation, which outlines how to proceed given specific errors

**Implement Tool Logic:**
- Use shared utilities to avoid code duplication
- Follow async/await patterns for all I/O
- Implement proper error handling
- Support multiple response formats (JSON and Markdown)
- Respect pagination parameters
- Check character limits and truncate appropriately

**Add Tool Annotations:**
- `readOnlyHint`: true (for read-only operations)
- `destructiveHint`: false (for non-destructive operations)
- `idempotentHint`: true (if repeated calls have same effect)
- `openWorldHint`: true (if interacting with external systems)

#### 2.4 Follow Python Best Practices

**Ensure the following:**
- Using `AutobotsMCPStdioServer` with proper tool registration via `@mcp.tool()` decorator
- Pydantic v2 models with `model_config`
- Type hints throughout
- Async/await for all I/O operations
- Proper imports organization
- Module-level constants (CHARACTER_LIMIT, API_BASE_URL)

---

### Phase 3: Review and Refine

After initial implementation:

#### 3.1 Code Quality Review

To ensure quality, review the code for:
- **DRY Principle**: No duplicated code between tools
- **Composability**: Shared logic extracted into functions
- **Consistency**: Similar operations return similar formats
- **Error Handling**: All external calls have error handling
- **Type Safety**: Full type coverage with Python type hints
- **Documentation**: Every tool has comprehensive docstrings

#### 3.2 Test the Server

**Important:** MCP servers are long-running processes that wait for requests over stdio/stdin. Running them directly (`python server.py`) will cause your process to hang indefinitely.

**Safe ways to test the server:**

1. **Use the AutobotsMCPClient (Recommended):**

````python
from autobots_sdk.base.mcp.clients.base_client import AutobotsMCPClient

# Connect to your server
client = AutobotsMCPClient(
    mcp_server_path="/path/to/your/server.py",
    name="test_client",
    debug=True
)

# List available tools
tools = client.list_tools()
print("Available tools:", tools)

# Call a tool
result = client.call_tool("my_tool", {"param1": "value", "param2": 10})
print("Result:", result)
````

2. **Use a timeout when testing:** `timeout 5s python server.py`

**For Python:**
- Verify Python syntax: `python -m py_compile your_server.py`
- Check imports work correctly by reviewing the file
- Or use the `AutobotsMCPClient` directly (it manages the server for stdio transport)

#### 3.3 Use Quality Checklist

To verify implementation quality, load the checklist from the Python implementation guide:
- See "Quality Checklist" in [🐍 Python Guide](./reference/python_mcp_server.md)

---

# Reference Files

## 📚 Documentation Library

Load these resources as needed during development:

### Core MCP Documentation (Load First)
- **MCP Protocol**: Fetch from `https://modelcontextprotocol.io/llms-full.txt` - Complete MCP specification
- [📋 MCP Best Practices](./reference/mcp_best_practices.md) - Universal MCP guidelines including:
  - Server and tool naming conventions
  - Response format guidelines (JSON vs Markdown)
  - Pagination best practices
  - Character limits and truncation strategies
  - Tool development guidelines
  - Security and error handling standards

### SDK Documentation (Load During Phase 1/2)
- **Python SDK**: Fetch from `https://raw.githubusercontent.com/modelcontextprotocol/python-sdk/main/README.md`
- **Autobots Python SDK** - Read the file `/p/hdk/pu_tu/prd/autobots_sdk/2.2.1/autobots_sdk/base/mcp/servers/README.md`

### Python Implementation Guide (Load During Phase 2)
- [🐍 Python Implementation Guide](./reference/python_mcp_server.md) - Complete Python/FastMCP guide with:
  - Server initialization patterns using `AutobotsMCPStdioServer`
  - Pydantic model examples
  - Tool registration with `@mcp.tool()` decorator
  - Complete working examples
  - Quality checklist

### Testing with AutobotsMCPClient
- Use `AutobotsMCPClient` from `/p/hdk/pu_tu/prd/autobots_sdk/2.2.1/autobots_sdk/base/mcp/clients/base_client.py`
- Connect to your server using `mcp_server_path` parameter
- Test tool calls programmatically

