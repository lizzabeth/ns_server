angular.module('mnBucketsDetailsService').factory('mnBucketsDetailsService',
  function ($q, mnHttp, mnTasksDetails, mnPoolDefault, mnFormatMemSizeFilter) {
    var mnBucketsDetailsService = {};

    mnBucketsDetailsService.getBucketRamGuageConfig = function (ramSummary) {
      var options = {
        topRight: {
          name: 'Cluster quota',
          value: mnFormatMemSizeFilter(ramSummary.total)
        },
        items: [{
          name: 'Other Buckets',
          value: ramSummary.otherBuckets,
          itemStyle: {'background-color': '#00BCE9', 'z-index': '2'},
          labelStyle: {'color': '#1878a2', 'text-align': 'left'}
        }, {
          name: 'This Bucket',
          value: ramSummary.thisAlloc,
          itemStyle: {'background-color': '#7EDB49', 'z-index': '1'},
          labelStyle: {'color': '#409f05', 'text-align': 'center'}
        }, {
          name: 'Free',
          value: ramSummary.total - ramSummary.otherBuckets - ramSummary.thisAlloc,
          itemStyle: {'background-color': '#E1E2E3'},
          labelStyle: {'color': '#444245', 'text-align': 'right'}
        }],
        markers: []
      };

      if (options.items[2].value < 0) {
        options.items[1].value = ramSummary.total - ramSummary.otherBuckets;
        options.items[2] = {
          name: 'Overcommitted',
          value: ramSummary.otherBuckets + ramSummary.thisAlloc - ramSummary.total,
          itemStyle: {'background-color': '#F40015'},
          labelStyle: {'color': '#e43a1b'}
        };
        options.markers.push({
          value: ramSummary.total,
          itemStyle: {'background-color': '#444245'}
        });
        options.markers.push({
          value: ramSummary.otherBuckets + ramSummary.thisAlloc,
          itemStyle: {'background-color': 'red'}
        });
        options.topLeft = {
          name: 'Total Allocated',
          value: mnFormatMemSizeFilter(ramSummary.otherBuckets + ramSummary.thisAlloc),
          itemStyle: {'color': '#e43a1b'}
        };
      }
      return options;
    };


    function getGuageConfig(total, thisBucket, otherBuckets, otherData) {
      var free = total - otherData - thisBucket - otherBuckets;

      return {
        topLeft: {
          name: 'Other Data',
          value: mnFormatMemSizeFilter(otherData)
        },
        topRight: {
          name: 'Total Cluster Storage',
          value: mnFormatMemSizeFilter(total)
        },
        items: [{
          name: null,
          value: otherData,
          itemStyle: {'background-color':'#FDC90D', 'z-index': '3'},
          labelStyle: {}
        }, {
          name: 'Other Buckets',
          value: otherBuckets,
          itemStyle: {'background-color':'#00BCE9', 'z-index': '2'},
          labelStyle: {'color':'#1878a2', 'text-align': 'left'}
        }, {
          name: 'This Bucket',
          value: thisBucket,
          itemStyle: {'background-color':'#7EDB49', 'z-index': '1'},
          labelStyle: {'color':'#409f05', 'text-align': 'center'}
        }, {
          name: 'Free',
          value: free,
          itemStyle: {'background-color':'#E1E2E3'},
          labelStyle: {'color':'#444245', 'text-align': 'right'}
        }]
      };
    }

    mnBucketsDetailsService.getDetails = function (bucket) {
      return $q.all([
        mnHttp({
          method: 'GET',
          url: bucket.uri + "&basic_stats=true"
        }),
        mnTasksDetails.get(),
        mnPoolDefault.get()
      ]).then(function (resp) {
        var details = resp[0].data;
        var tasks = resp[1];
        var poolDefault = resp[2];

        var hdd = details.basicStats.storageTotals.hdd;
        var ram = details.basicStats.storageTotals.ram;

        details.ramConfig = mnBucketsDetailsService.getBucketRamGuageConfig({
          total: ram.quotaTotalPerNode * details.nodes.length,
          thisAlloc: details.quota.ram,
          otherBuckets: ram.quotaUsedPerNode * details.nodes.length - details.quota.ram
        });

        details.isMembase = bucket.isMembase;
        details.warmUpTasks = _.filter(tasks.tasks, function (task) {
          var isNeeded = task.type === 'warming_up' && task.status === 'running' && task.bucket === bucket.name;
          if (isNeeded) {
            task.hostname = _.find(poolDefault.nodes, function (node) {
              return node.otpNode === task.node;
            }).hostname;
          }
          return isNeeded;
        });

        details.thisBucketCompactionTask = _.find(tasks.tasks, function (task) {
          return task.type === 'bucket_compaction' && task.bucket === bucket.name;
        });

        if (bucket.isMembase) {
          details.hddConfig = getGuageConfig(
            hdd.total,
            details.basicStats.diskUsed,
            hdd.usedByData - details.basicStats.diskUsed,
            hdd.used - hdd.usedByData
          );
        } else {
          details.noCompaction = true;
        }

        return details;
      });
    };
    return mnBucketsDetailsService;
  });