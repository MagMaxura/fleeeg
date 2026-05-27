class ReviewModel {
  final int id;
  final int tripId;
  final String reviewerId;
  final String driverId;
  final double rating;
  final String comment;
  final DateTime? createdAt;

  ReviewModel({
    required this.id,
    required this.tripId,
    required this.reviewerId,
    required this.driverId,
    required this.rating,
    required this.comment,
    this.createdAt,
  });

  factory ReviewModel.fromJson(Map<String, dynamic> json) {
    return ReviewModel(
      id: (json['id'] ?? 0) as int,
      tripId: (json['trip_id'] ?? json['tripId'] ?? 0) as int,
      reviewerId: (json['reviewer_id'] ?? json['reviewerId'] ?? '') as String,
      driverId: (json['driver_id'] ?? json['driverId'] ?? '') as String,
      rating: ((json['rating'] ?? 5.0) as num).toDouble(),
      comment: (json['comment'] ?? '') as String,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString())
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'reviewer_id': reviewerId,
      'driver_id': driverId,
      'rating': rating,
      'comment': comment,
      if (createdAt != null) 'created_at': createdAt!.toIso8601String(),
    };
  }
}
