enum UserRole { customer, driver, admin }

class ProfileModel {
  final String id;
  final String fullName;
  final String? phone;
  final UserRole role;
  final String? photoUrl;
  
  // Specific fields for drivers
  final String? vehicleType;
  final String? vehiclePlate;
  final String? vehiclePhotoUrl;
  final String? dniFrontUrl;
  final String? dniBackUrl;
  final String? licenseUrl;
  final double rating;

  ProfileModel({
    required this.id,
    required this.fullName,
    this.phone,
    required this.role,
    this.photoUrl,
    this.vehicleType,
    this.vehiclePlate,
    this.vehiclePhotoUrl,
    this.dniFrontUrl,
    this.dniBackUrl,
    this.licenseUrl,
    this.rating = 5.0,
  });

  factory ProfileModel.fromJson(Map<String, dynamic> json) {
    UserRole roleVal = UserRole.customer;
    if (json['role'] == 'driver') {
      roleVal = UserRole.driver;
    } else if (json['role'] == 'admin') {
      roleVal = UserRole.admin;
    }

    return ProfileModel(
      id: json['id'] as String,
      fullName: (json['full_name'] ?? json['fullName'] ?? 'Usuario') as String,
      phone: json['phone'] as String?,
      role: roleVal,
      photoUrl: (json['photo_url'] ?? json['photoUrl']) as String?,
      vehicleType: (json['vehicle_type'] ?? json['vehicleType']) as String?,
      vehiclePlate: (json['vehicle_plate'] ?? json['vehiclePlate']) as String?,
      vehiclePhotoUrl: (json['vehicle_photo_url'] ?? json['vehiclePhotoUrl']) as String?,
      dniFrontUrl: (json['dni_front_url'] ?? json['dniFrontUrl']) as String?,
      dniBackUrl: (json['dni_back_url'] ?? json['dniBackUrl']) as String?,
      licenseUrl: (json['license_url'] ?? json['licenseUrl']) as String?,
      rating: ((json['rating'] ?? 5.0) as num).toDouble(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'full_name': fullName,
      'phone': phone,
      'role': role.name,
      'photo_url': photoUrl,
      'vehicle_type': vehicleType,
      'vehicle_plate': vehiclePlate,
      'vehicle_photo_url': vehiclePhotoUrl,
      'dni_front_url': dniFrontUrl,
      'dni_back_url': dniBackUrl,
      'license_url': licenseUrl,
      'rating': rating,
    };
  }
}
