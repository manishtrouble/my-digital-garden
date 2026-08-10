---
title: Why You Can’t Run a Database on a Standard Network Share
created:
  - 2026-02-04 11:48
tags:
  - evergreen
  - postgres
  - azure
  - containers
  - smb
  - managed-services
by: Manish
---
> **_TL;DR: Databases like PostgreSQL require low-level filesystem features like POSIX permissions, hard links, and atomic fsync that standard network protocols like SMB (Azure Files) cannot provide. For production workloads in Azure, using a managed service like PostgreSQL Flexible Server is recommended._**  

Last week, I faced a challenge of persisting data inside a PostgreSQL container running in [Azure Container Apps (ACA)](https://azure.microsoft.com/en-us/products/container-apps). I found a [StackOverflow thread](https://stackoverflow.com/questions/74927833/persist-data-inside-azure-container-app-that-runs-postgres-db) discussing the same. I thought:  
_Why can’t I just mount an Azure native filesystem like Azure Blob Storage or Azure Files to persist the data?_

So, I tried to use [Azure Files](https://learn.microsoft.com/en-us/azure/storage/files/storage-files-introduction) as a volume mount for the Postgres data directory. But I kept running into `Operation not permitted` and other permission errors. After a day of trying, debugging, and failing, I realized that it is actually not possible*.
## Understanding the Problem
Azure Files primarily uses the **SMB (Server Message Block)** protocol. While SMB is excellent for general-purpose file sharing (like CMS uploads or shared docs), it is fundamentally incompatible with the way a database engine interacts with a disk.  
A database is not just a "file share". It is a complex engine that requires low-level, atomic control over the bits and bytes. Here are some non negotiables for Postgres:  
- **Hard Links**: Postgres relies on hard links for managing Write-Ahead Logging (WAL) and certain internal operations. SMB does not support hard links.  
- **POSIX Permissions**: Postgres requires specific ownership (chown) and permission bits (`chmod 0700`) on its data folders. SMB’s permission model is too abstract and cannot represent these Linux-native requirements, leading to "Permission Denied" errors even if you are the root user.  
- **Fsync Integrity**: Postgres uses the `fsync()` system call to ensure data is physically flushed from the OS cache to the physical disk. SMB’s caching layers often provide "lazy" consistency, which can lead to silent data corruption during a network flicker or a container crash.  
## Solution
I accepted my defeat. I finally gave in to Azure's Managed Service for Databases: **PostgreSQL Flexible Server**. And it makes sense, because Azure handles the underlying Block Storage ([Managed Disks](https://learn.microsoft.com/en-us/azure/postgresql/compute-storage/concepts-storage)), which natively supports the IOPS and atomic guarantees Postgres requires.
## References:
[Creating a Database Cluster](https://www.postgresql.org/docs/current/creating-cluster.html)  
[PostgreSQL's fsync() surprise](https://lwn.net/Articles/752063/)
