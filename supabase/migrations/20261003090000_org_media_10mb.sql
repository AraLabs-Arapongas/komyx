-- Phone photos used as invite art are often 3–6 MB; the 5 MB bucket cap rejected them.
update storage.buckets set file_size_limit = 10485760 where id = 'org-media';
