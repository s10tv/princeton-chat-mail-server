if [ "x$MONGO_URL" != "x" ]; then echo "Running tests with MONGO_URL set is REALLY REALLY DANGEROUS. You were about to wipe the DB"; exit 1; fi
