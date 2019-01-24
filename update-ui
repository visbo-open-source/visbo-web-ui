#!/bin/bash
cd $HOME/GitHub/visbo-server-ui
echo "01: Checking Local Status of Visbo UI Branch"
git status
if [ $? -ne 0 ]
then
  echo "FATAL: Local Changes have to be checked first before upgrading."
  exit
fi

echo  "02: Pull Branch from Repository Server"
git pull
if [ $? -ne 0 ]
then
  echo "FATAL: Pull Failed to update Visbo UI  Branch."
  exit
fi

echo "03: Install subcomponents from NODE environment"
npm install
if [ $? -ne 0 ]
then
  echo "FATAL: Install of NODE components failed."
  exit
fi

echo "04: Compile for Production"
ng build --prod
if [ $? -ne 0 ]
then
  echo "FATAL: Error during compiling the Visbo UI Branch."
  exit
fi

echo "05: Remove the Visbo UI Client from production directory"
sudo rm -rf /var/www/visbo-web-ui/*
echo "06: Copy the Visbo UI Client to production directory"
sudo cp -r dist/* /var/www/visbo-web-ui

echo "Visbo UI Client Updated Successfully"
