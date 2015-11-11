#!/bin/sh
set -euo pipefail
IFS=$'\n\t'

source ./common.sh

ROOTMACHINENAME=dwp
DOCKERFILES="$(cd "$(dirname "$(pwd)/../../../../")"; pwd)"

removeMachineIfExists $ROOTMACHINENAME
createVirtualMachine $ROOTMACHINENAME 
addMountPoints $ROOTMACHINENAME 
addSharesPoints $ROOTMACHINENAME $DOCKERFILES
setEnvVariables $ROOTMACHINENAME
configureRemoteRegistry $ROOTMACHINENAME

