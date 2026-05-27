class ChatMessageModel {
  final int id;
  final int tripId;
  final String senderId;
  final String content;
  final DateTime createdAt;

  ChatMessageModel({
    required this.id,
    required this.tripId,
    required this.senderId,
    required this.content,
    required this.createdAt,
  });

  factory ChatMessageModel.fromJson(Map<String, dynamic> json) {
    return ChatMessageModel(
      id: (json['id'] ?? 0) as int,
      tripId: (json['trip_id'] ?? json['tripId'] ?? 0) as int,
      senderId: (json['sender_id'] ?? json['senderId'] ?? '') as String,
      content: (json['content'] ?? '') as String,
      createdAt: json['created_at'] != null
          ? DateTime.tryParse(json['created_at'].toString()) ?? DateTime.now()
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'trip_id': tripId,
      'sender_id': senderId,
      'content': content,
      'created_at': createdAt.toIso8601String(),
    };
  }
}
