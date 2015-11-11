#!/bin/sh
set -euo pipefail
IFS=$'\n\t'

function createVirtualMachine() {
	local MACHINENAME=$1
	echo "Create Virtual Machine"
	docker-machine create $MACHINENAME --driver virtualbox --virtualbox-cpu-count "-1" --virtualbox-disk-size "10240" --virtualbox-memory "2048" --virtualbox-hostonly-cidr="192.168.69.1/24"
}

function removeMachineIfExists() {
	local MACHINENAME=$1
	
	if docker-machine ls | grep -q $MACHINENAME 
	then 
		echo "Deleting machine"
		docker-machine rm $MACHINENAME
		sleep 3s
	fi
}

function addSharesPoints() {
	local MACHINENAME=$1
	local DOCKERFILES=$2

	docker-machine stop $MACHINENAME

	echo "Add mount points to VM"	
	vboxmanage sharedfolder add $MACHINENAME  --name gluster --hostpath "$DOCKERFILES/docker/gluster" --automount
	vboxmanage sharedfolder add $MACHINENAME  --name repo --hostpath "$DOCKERFILES/docker/repo" --automount
	vboxmanage sharedfolder add $MACHINENAME  --name git --hostpath "$DOCKERFILES/git" --automount
	echo "Mount points added" 
	
	docker-machine start $MACHINENAME
}

function addMountPoints() {
	local MACHINENAME=$1

	echo "Mount file system extensions"
	docker-machine ssh $MACHINENAME "sudo sh -c 'echo sudo mkdir /mnt/gluster >> /var/lib/boot2docker/profile'"
	docker-machine ssh $MACHINENAME "sudo sh -c 'echo sudo mkdir /mnt/repo >> /var/lib/boot2docker/profile'"
	docker-machine ssh $MACHINENAME "sudo sh -c 'echo sudo mkdir /mnt/git >> /var/lib/boot2docker/profile'"
	docker-machine ssh $MACHINENAME "sudo sh -c 'echo mount.vboxsf -o uid=1000,gid=50 repo /mnt/repo >> /var/lib/boot2docker/profile'"
	docker-machine ssh $MACHINENAME "sudo sh -c 'echo mount.vboxsf -o uid=1000,gid=50 gluster /mnt/gluster >> /var/lib/boot2docker/profile'"
	docker-machine ssh $MACHINENAME "sudo sh -c 'echo mount.vboxsf -o uid=1000,gid=50 git /mnt/git >> /var/lib/boot2docker/profile'"
	echo "Mounts complete"
}

function setEnvVariables() {
	local MACHINENAME=$1
	echo "Setting Environment variables"
	eval "$(docker-machine env $MACHINENAME --shell bash)"
}