class TripModel {
  final int id;
  final String customerId;
  final String? driverId;
  final String originAddress;
  final String destinationAddress;
  final double originLat;
  final double originLng;
  final double destinationLat;
  final double destinationLng;
  final String cargoDescription;
  final double price;
  final String status; // requested, accepted, loading, in_transit, completed, paid
  final List<String> cargoPhotos;
  final DateTime? createdAt;

  // Extended DB columns for premium features
  final String? originCity;
  final String? originProvince;
  final String? destinationCity;
  final String? destinationProvince;
  final double estimatedWeightKg;
  final double estimatedVolumeM3;
  final double? distanceKm;
  final int? estimatedDriveTimeMin;
  final int? estimatedLoadTimeMin;
  final int? estimatedUnloadTimeMin;
  final int? driverArrivalTimeMin;
  final bool needsLoadingHelp;
  final bool needsUnloadingHelp;
  final int numberOfHelpers;
  final DateTime? startTime;
  final int? finalDurationMin;
  final double? finalPrice;
  final DateTime? scheduledDate;
  final String? payoutRequestId;

  TripModel({
    required this.id,
    required this.customerId,
    this.driverId,
    required this.originAddress,
    required this.destinationAddress,
    required this.originLat,
    required this.originLng,
    required this.destinationLat,
    required this.destinationLng,
    required this.cargoDescription,
    required this.price,
    required this.status,
    required this.cargoPhotos,
    this.createdAt,
    this.originCity,
    this.originProvince,
    this.destinationCity,
    this.destinationProvince,
    this.estimatedWeightKg = 0.0,
    this.estimatedVolumeM3 = 0.0,
    this.distanceKm,
    this.estimatedDriveTimeMin,
    this.estimatedLoadTimeMin,
    this.estimatedUnloadTimeMin,
    this.driverArrivalTimeMin,
    this.needsLoadingHelp = false,
    this.needsUnloadingHelp = false,
    this.numberOfHelpers = 0,
    this.startTime,
    this.finalDurationMin,
    this.finalPrice,
    this.scheduledDate,
    this.payoutRequestId,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    var photosFromJson = json['cargo_photos'] ?? json['cargoPhotos'] ?? [];
    List<String> photosList = [];
    if (photosFromJson is List) {
      photosList = photosFromJson.map((e) => e?.toString() ?? '').toList();
    }

    return TripModel(
      id: (json['id'] ?? 0) as int,
      customerId: (json['customer_id'] ?? json['customerId'] ?? '') as String,
      driverId: json['driver_id'] as String?,
      originAddress: (json['origin'] ?? json['origin_address'] ?? json['originAddress'] ?? '') as String,
      destinationAddress: (json['destination'] ?? json['destination_address'] ?? json['destinationAddress'] ?? '') as String,
      originLat: ((json['origin_lat'] ?? 0.0) as num).toDouble(),
      originLng: ((json['origin_lng'] ?? 0.0) as num).toDouble(),
      destinationLat: ((json['destination_lat'] ?? 0.0) as num).toDouble(),
      destinationLng: ((json['destination_lng'] ?? 0.0) as num).toDouble(),
      cargoDescription: (json['cargo_details'] ?? json['cargo_description'] ?? json['cargoDescription'] ?? '') as String,
      price: ((json['price'] ?? 0.0) as num).toDouble(),
      status: (json['status'] ?? 'requested') as String,
      cargoPhotos: photosList,
      createdAt: json['created_at'] != null 
          ? DateTime.tryParse(json['created_at'].toString()) 
          : null,
      originCity: json['origin_city'] as String?,
      originProvince: json['origin_province'] as String?,
      destinationCity: json['destination_city'] as String?,
      destinationProvince: json['destination_province'] as String?,
      estimatedWeightKg: ((json['estimated_weight_kg'] ?? 0.0) as num).toDouble(),
      estimatedVolumeM3: ((json['estimated_volume_m3'] ?? 0.0) as num).toDouble(),
      distanceKm: json['distance_km'] != null ? ((json['distance_km']) as num).toDouble() : null,
      estimatedDriveTimeMin: json['estimated_drive_time_min'] as int?,
      estimatedLoadTimeMin: json['estimated_load_time_min'] as int?,
      estimatedUnloadTimeMin: json['estimated_unload_time_min'] as int?,
      driverArrivalTimeMin: json['driver_arrival_time_min'] as int?,
      needsLoadingHelp: (json['needs_loading_help'] ?? false) as bool,
      needsUnloadingHelp: (json['needs_unloading_help'] ?? false) as bool,
      numberOfHelpers: (json['number_of_helpers'] ?? 0) as int,
      startTime: json['start_time'] != null ? DateTime.tryParse(json['start_time'].toString()) : null,
      finalDurationMin: json['final_duration_min'] as int?,
      finalPrice: json['final_price'] != null ? ((json['final_price']) as num).toDouble() : null,
      scheduledDate: json['scheduled_date'] != null ? DateTime.tryParse(json['scheduled_date'].toString()) : null,
      payoutRequestId: json['payout_request_id'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'customer_id': customerId,
      'driver_id': driverId,
      'origin': originAddress,
      'destination': destinationAddress,
      'cargo_details': cargoDescription,
      'origin_lat': originLat,
      'origin_lng': originLng,
      'destination_lat': destinationLat,
      'destination_lng': destinationLng,
      'price': price,
      'status': status,
      'cargo_photos': cargoPhotos,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
      'origin_city': originCity,
      'origin_province': originProvince,
      'destination_city': destinationCity,
      'destination_province': destinationProvince,
      'estimated_weight_kg': estimatedWeightKg,
      'estimated_volume_m3': estimatedVolumeM3,
      'distance_km': distanceKm,
      'estimated_drive_time_min': estimatedDriveTimeMin,
      'estimated_load_time_min': estimatedLoadTimeMin,
      'estimated_unload_time_min': estimatedUnloadTimeMin,
      'driver_arrival_time_min': driverArrivalTimeMin,
      'needs_loading_help': needsLoadingHelp,
      'needs_unloading_help': needsUnloadingHelp,
      'number_of_helpers': numberOfHelpers,
      if (startTime != null) 'start_time': startTime!.toIso8601String(),
      'final_duration_min': finalDurationMin,
      'final_price': finalPrice,
      if (scheduledDate != null) 'scheduled_date': scheduledDate!.toIso8601String(),
      'payout_request_id': payoutRequestId,
    };
  }
}
