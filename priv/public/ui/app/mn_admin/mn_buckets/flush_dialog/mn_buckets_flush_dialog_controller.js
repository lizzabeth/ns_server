(function () {
  angular.module('mnBuckets').controller('mnBucketsFlushDialogController', mnBucketsFlushDialogController);

  function mnBucketsFlushDialogController($scope, $uibModalInstance, bucket, mnPromiseHelper, mnBucketsDetailsService) {
    var vm = this;
    vm.doFlush = doFlush;

    function doFlush() {
      var promise = mnBucketsDetailsService.flushBucket(bucket);
      mnPromiseHelper.handleModalAction($scope, promise, $uibModalInstance, vm);
    }
  }
})();

