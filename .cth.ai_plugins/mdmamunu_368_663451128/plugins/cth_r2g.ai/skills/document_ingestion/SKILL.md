---
name : document_ingestion
description: Ingests user-provided local documents (from the user’s workspace/area), indexes them into the SAGE knowledge base, and makes their content searchable and available for context-aware assistance.
---

# Document Ingestion Guide

## Overview

This skill ingests local documentation from the user area into the SAGE local knowledge base so that the content becomes searchable for downstream agents and tools.

### For Agents
**Use the `run_in_terminal` tool to execute the commands below.**

### Command-line invocation
```bash
/p/hdk/pu_tu/prd/autobots_sdk/latest/venv_autobots/bin/python3 .github/skills/document_ingestion/scripts/ingest_documents.py -input_paths "/path/to/doc1" "/path/to/doc2" "/path/to/doc3" -output_rag_directory "/path/to/directory_rag"
```

Get help by doing command as below:
```bash
python .claude/skills/document_ingestion/scripts/ingest_documents.py -help
```
